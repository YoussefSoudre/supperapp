import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { hostname } from 'os';
import { DomainEvents } from '../../../shared/events/domain-events.constants';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';

// ─── Interfaces internes ──────────────────────────────────────────────────────

interface RideRequestedPayload {
  rideId: string;
  userId: string;
  cityId: string;
  pickupLat: number;
  pickupLng: number;
  type: string;        // moto | car | carpool
  timestamp: Date;
}

interface DriverCandidate {
  id:           string;
  lat:          number;
  lng:          number;
  rating:       number;       // 0.0 – 5.0
  acceptRate:   number;       // 0.0 – 1.0
  vehicleType:  string;
  distanceKm:   number;
}

interface ScoredDriver extends DriverCandidate {
  score:              number;
  estimatedPriceXof:  number;
  etaMinutes:         number;
}

/**
 * DispatchService — Moteur de dispatch temps réel.
 *
 * Algorithme en 4 étapes :
 *   1. Lock Redis NX → anti-doublon multi-instances
 *   2. Redis GEORADIUS → présélection géospatiale < 1 ms
 *   3. Scoring Haversine + rating + taux d'acceptation
 *   4. Waterfall → offre séquentielle, TTL 15 s par chauffeur
 *
 * Scalabilité horizontale via Redis Streams + Consumer Group :
 *   chaque instance consomme exclusivement ses rides assignés.
 *
 * Formule de scoring :
 *   score = 0.5 × S_dist + 0.3 × S_rating + 0.2 × S_accept
 *   S_dist   = 1 - (distance / rayon_max)
 *   S_rating = rating / 5
 *   S_accept = taux_acceptation historique
 */
@Injectable()
export class DispatchService implements OnModuleInit {
  private readonly logger = new Logger(DispatchService.name);

  /** Rayon de recherche en km par type de course */
  private readonly RADIUS: Record<string, number> = {
    moto:    5,
    car:     5,
    carpool: 3,  // rayon réduit — trajets partagés nécessitent forte proximité
  };

  private readonly OFFER_TTL_S         = 15;   // secondes pour accepter l'offre
  private readonly MAX_DRIVER_ATTEMPTS = 5;    // max chauffeurs essayés en cascade
  private readonly DISPATCH_LOCK_TTL_S = 60;   // lock anti-doublon
  private readonly POLL_INTERVAL_MS    = 500;  // intervalle polling réponse chauffeur
  private readonly STREAM_KEY          = 'stream:dispatch';
  private readonly CONSUMER_GROUP      = 'dispatch-workers';

  constructor(
    private readonly eventBus: EventBusService,
    private readonly redis: RedisService,
  ) {}

  // ─── Initialisation Consumer Group Redis Streams ────────────────────────────

  async onModuleInit(): Promise<void> {
    try {
      await this.redis.client.xgroup(
        'CREATE', this.STREAM_KEY, this.CONSUMER_GROUP, '$', 'MKSTREAM',
      );
      this.logger.log(`Consumer group '${this.CONSUMER_GROUP}' created`);
    } catch {
      // Déjà existant — ignoré
    }
    // Démarrer polling en arrière-plan (non-bloquant)
    void this.pollStream();
  }

  // ─── Écoute EventEmitter local (dev / single instance) ─────────────────────

  @OnEvent(DomainEvents.RIDE_REQUESTED)
  async onRideRequested(payload: RideRequestedPayload): Promise<void> {
    // En production multi-instances, publier dans le stream Redis à la place
    // await this.redis.client.xadd(this.STREAM_KEY, '*', ...flattenPayload(payload));
    await this.dispatchWithLock(payload);
  }

  // ─── Consumer Group polling (multi-instances) ───────────────────────────────

  private async pollStream(): Promise<void> {
    const consumerId = `worker-${process.pid}-${hostname()}`;
    while (true) {
      try {
        const result: any = await this.redis.client.xreadgroup(
          'GROUP', this.CONSUMER_GROUP, consumerId,
          'COUNT', 10,
          'BLOCK', 2000,             // attendre 2 s si stream vide
          'STREAMS', this.STREAM_KEY, '>',
        );
        if (!result) continue;

        for (const [, entries] of result) {
          for (const [msgId, fields] of entries) {
            const payload = this.parseStreamFields(fields as string[]);
            await this.dispatchWithLock(payload);
            await this.redis.client.xack(this.STREAM_KEY, this.CONSUMER_GROUP, msgId);
          }
        }
      } catch (err) {
        this.logger.error('Stream polling error', err);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  // ─── Étape 0 — Lock Redis NX (anti-doublon) ─────────────────────────────────

  private async dispatchWithLock(payload: RideRequestedPayload): Promise<void> {
    const lockKey = `dispatch:lock:${payload.rideId}`;
    const acquired = await this.redis.client.set(
      lockKey, '1', 'EX', this.DISPATCH_LOCK_TTL_S, 'NX',
    );
    if (!acquired) {
      this.logger.warn(`Dispatch already in progress for ride ${payload.rideId}`);
      return;
    }
    try {
      await this.dispatch(payload);
    } finally {
      await this.redis.client.del(lockKey);
    }
  }

  // ─── Étape 1 — Recherche géospatiale Redis GEO ──────────────────────────────

  private async dispatch(payload: RideRequestedPayload): Promise<void> {
    const radius = this.RADIUS[payload.type] ?? 5;
    const geoKey = `geo:drivers:${payload.cityId}`;

    this.logger.log(`Dispatching ride ${payload.rideId} | type=${payload.type} | r=${radius}km`);

    // GEORADIUS → O(log N + M) sur index Geohash ZSET
    // Retourne: [[driverId, distKm, [lng, lat]], ...]
    const geoResults: any[] = await this.redis.client.georadius(
      geoKey,
      payload.pickupLng, payload.pickupLat,
      radius, 'km',
      'ASC', 'COUNT', 20,
      'WITHCOORD', 'WITHDIST',
    );

    if (!geoResults?.length) {
      this.logger.warn(`No drivers found within ${radius}km for ride ${payload.rideId}`);
      await this.emitNoDriver(payload);
      return;
    }

    // ─── Étape 2 — Enrichissement métadata + scoring ────────────────────────
    const candidates = await this.enrichAndScore(geoResults, payload);

    if (!candidates.length) {
      await this.emitNoDriver(payload);
      return;
    }

    // Broadcast prévisualisation tarifs vers le client (top 5)
    // this.gateway.emitToUser(payload.userId, 'ride:preview', {
    //   rideId: payload.rideId,
    //   drivers: candidates.slice(0, 5).map(d => ({
    //     vehicleType: d.vehicleType,
    //     distanceKm: d.distanceKm,
    //     etaMinutes: d.etaMinutes,
    //     estimatedPriceXof: d.estimatedPriceXof,
    //     rating: d.rating,
    //   })),
    // });

    // ─── Étape 3 — Dispatch selon type ──────────────────────────────────────
    if (payload.type === 'carpool') {
      await this.handleCarpool(candidates, payload);
    } else {
      await this.waterfallOffer(candidates, payload);
    }
  }

  // ─── Étape 2 — Enrichissement metadata + scoring ────────────────────────────

  private async enrichAndScore(
    geoResults: any[],
    payload: RideRequestedPayload,
  ): Promise<ScoredDriver[]> {
    const radius = this.RADIUS[payload.type] ?? 5;

    // Récupérer metadata de tous les drivers en 1 pipeline Redis
    const pipeline = this.redis.client.pipeline();
    for (const entry of geoResults) {
      const driverId = entry[0] as string;
      pipeline.hgetall(`driver:meta:${driverId}`);
    }
    const metaResults: any[] = await pipeline.exec() ?? [];

    const scored: ScoredDriver[] = [];

    for (let i = 0; i < geoResults.length; i++) {
      const [driverId, distStr, [lng, lat]] = geoResults[i] as [string, string, [string, string]];
      const meta = metaResults[i]?.[1] as Record<string, string> | null;

      // Ignorer les drivers dont le TTL metadata a expiré (offline implicite)
      if (!meta?.updatedAt) continue;

      const distanceKm = parseFloat(distStr);
      const rating     = parseFloat(meta.rating ?? '4.5');
      const acceptRate = parseFloat(meta.acceptRate ?? '0.8');
      const vehicleType = meta.vehicleType ?? 'moto';

      if (vehicleType !== payload.type && payload.type !== 'carpool') continue;

      const candidate: DriverCandidate = {
        id: driverId,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        rating,
        acceptRate,
        vehicleType,
        distanceKm,
      };

      // Score composé : proximité 50% + note 30% + taux acceptation 20%
      const S_dist   = Math.max(0, 1 - distanceKm / radius);
      const S_rating = rating / 5;
      const S_accept = acceptRate;
      const score    = S_dist * 0.5 + S_rating * 0.3 + S_accept * 0.2;

      // ETA estimé (vitesse moto/voiture ~30 km/h en ville)
      const etaMinutes = Math.ceil((distanceKm / 30) * 60);

      // Prix estimé (simplifié — en production charger PricingRule depuis cache)
      const estimatedPriceXof = this.estimatePrice(distanceKm, payload.type);

      scored.push({ ...candidate, score, etaMinutes, estimatedPriceXof });
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  // ─── Waterfall — Offre séquentielle avec timeout ─────────────────────────────

  private async waterfallOffer(
    candidates: ScoredDriver[],
    payload: RideRequestedPayload,
  ): Promise<void> {
    const attempts = Math.min(this.MAX_DRIVER_ATTEMPTS, candidates.length);

    for (let i = 0; i < attempts; i++) {
      const driver = candidates[i];
      const offerKey = `offer:${payload.rideId}:${driver.id}`;

      // Stocker l'offre dans Redis avec TTL
      await this.redis.client.set(
        offerKey,
        JSON.stringify({ rideId: payload.rideId, status: 'pending' }),
        'EX', this.OFFER_TTL_S,
      );

      // Notifier le chauffeur via event (→ NotificationsService → FCM push)
      await this.eventBus.emit(DomainEvents.DISPATCH_DRIVER_ASSIGNED, {
        version: 1,
        rideId: payload.rideId,
        driverId: driver.id,
        userId: payload.userId,
        estimatedPriceXof: driver.estimatedPriceXof,
        etaMinutes: driver.etaMinutes,
        offerExpiresAt: new Date(Date.now() + this.OFFER_TTL_S * 1000),
        timestamp: new Date(),
      });

      this.logger.log(`Offer sent to driver ${driver.id} (attempt ${i + 1}/${attempts})`);

      const accepted = await this.waitForDriverResponse(offerKey);
      if (accepted) {
        this.logger.log(`Driver ${driver.id} accepted ride ${payload.rideId}`);
        return;
      }

      // Nettoyage + tentative suivante
      await this.redis.client.del(offerKey);
      this.logger.warn(`Driver ${driver.id} rejected/timed out, trying next...`);
    }

    await this.emitNoDriver(payload);
  }

  // ─── Polling réponse chauffeur (500ms interval) ──────────────────────────────

  private async waitForDriverResponse(offerKey: string): Promise<boolean> {
    const deadline = Date.now() + this.OFFER_TTL_S * 1000;
    while (Date.now() < deadline) {
      const raw = await this.redis.client.get(offerKey);
      if (!raw) return false;  // TTL expiré → refus implicite
      const offer = JSON.parse(raw) as { status: string };
      if (offer.status === 'accepted') return true;
      if (offer.status === 'rejected') return false;
      await new Promise(r => setTimeout(r, this.POLL_INTERVAL_MS));
    }
    return false;
  }

  // ─── Covoiturage — Agrégation passagers ──────────────────────────────────────

  private async handleCarpool(
    candidates: ScoredDriver[],
    payload: RideRequestedPayload,
  ): Promise<void> {
    const carpoolKey = `carpool:active:${payload.cityId}`;
    const existing = await this.redis.client.get(carpoolKey);

    if (existing) {
      const carpool = JSON.parse(existing) as { driverId: string; currentLat: number; currentLng: number; rideId: string };
      const detourKm = this.haversineKm(
        carpool.currentLat, carpool.currentLng,
        payload.pickupLat, payload.pickupLng,
      );
      if (detourKm < 1.5) {
        // Détour acceptable — raccrocher ce passager à la course existante
        this.logger.log(`Joining carpool ride ${carpool.rideId} for ride ${payload.rideId}`);
        await this.eventBus.emit(DomainEvents.DISPATCH_DRIVER_ASSIGNED, {
          version: 1,
          rideId: payload.rideId,
          driverId: carpool.driverId,
          userId: payload.userId,
          carpoolRideId: carpool.rideId,
          timestamp: new Date(),
        });
        return;
      }
    }

    // Pas de covoiturage disponible → dispatcher comme course normale
    await this.waterfallOffer(candidates, payload);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Distance Haversine entre deux points GPS (en km).
   * Formule : d = 2R·atan2(√a, √(1−a))
   * où a = sin²(Δφ/2) + cos(φ₁)·cos(φ₂)·sin²(Δλ/2)
   */
  haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Estimation de prix simplifiée.
   * En production : charger PricingRule depuis Redis cache (TTL 5 min).
   */
  private estimatePrice(distanceKm: number, type: string): number {
    const BASE: Record<string, number>   = { moto: 200, car: 500, carpool: 150 };
    const PER_KM: Record<string, number> = { moto: 150, car: 250, carpool: 100 };
    const MIN: Record<string, number>    = { moto: 500, car: 1000, carpool: 300 };

    const raw = (BASE[type] ?? 200) + distanceKm * (PER_KM[type] ?? 150);
    const floored = Math.max(raw, MIN[type] ?? 500);
    return Math.round(floored / 5) * 5;  // arrondi au 5 XOF le plus proche
  }

  private async emitNoDriver(payload: RideRequestedPayload): Promise<void> {
    await this.eventBus.emit(DomainEvents.DISPATCH_NO_DRIVER_FOUND, {
      version: 1,
      rideId: payload.rideId,
      userId: payload.userId,
      cityId: payload.cityId,
      timestamp: new Date(),
    });
  }

  /** Convertit un tableau plat Redis Streams [k1, v1, k2, v2] en objet */
  private parseStreamFields(fields: string[]): RideRequestedPayload {
    const obj: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      obj[fields[i]] = fields[i + 1];
    }
    return {
      rideId:    obj['rideId'],
      userId:    obj['userId'],
      cityId:    obj['cityId'],
      pickupLat: parseFloat(obj['pickupLat']),
      pickupLng: parseFloat(obj['pickupLng']),
      type:      obj['type'],
      timestamp: new Date(obj['timestamp']),
    };
  }
}
