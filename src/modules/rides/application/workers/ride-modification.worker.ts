import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { DomainEvents } from '../../../../shared/events/domain-events.constants';
import { Ride, RideStatus } from '../../domain/entities/ride.entity';
import { RideModificationLog } from '../../domain/entities/ride-modification-log.entity';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import {
  QUEUES, JOBS,
  RecalculatePriceJob,
  NotifyDriverModificationJob,
} from '../queues/ride-queues.constants';

/**
 * RideModificationWorker — Processeur BullMQ pour les opérations liées
 * aux modifications de course (async, post-mutation).
 *
 * Jobs traités :
 *   1. RECALCULATE_PRICE         → recalcul prix + mise à jour ride
 *   2. NOTIFY_DRIVER_MODIFICATION → push notification chauffeur
 *   3. RESOLVE_DRIVER_CONFLICT    → résolution conflict si pas de réponse
 */
@Processor(QUEUES.RIDE_MODIFICATION)
@Injectable()
export class RideModificationWorker extends WorkerHost {
  private readonly logger = new Logger(RideModificationWorker.name);

  constructor(
    @InjectRepository(Ride)
    private readonly rideRepo: Repository<Ride>,
    @InjectRepository(RideModificationLog)
    private readonly logRepo: Repository<RideModificationLog>,
    @InjectQueue(QUEUES.RIDE_MODIFICATION)
    private readonly selfQueue: Queue,
    private readonly eventBus: EventBusService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOBS.RECALCULATE_PRICE:
        await this.recalculatePrice(job.data as RecalculatePriceJob);
        break;
      case JOBS.NOTIFY_DRIVER_MODIFICATION:
        await this.notifyDriver(job.data as NotifyDriverModificationJob);
        break;
      case JOBS.RESOLVE_DRIVER_CONFLICT:
        await this.resolveConflict(job.data as { rideId: string; driverId: string; reason: string; oldDropoffLat?: number; oldDropoffLng?: number });
        break;
      default:
        this.logger.warn(`Unknown job: ${job.name}`);
    }
  }

  // ─── 1. Recalcul prix ────────────────────────────────────────────────────────

  private async recalculatePrice(data: RecalculatePriceJob): Promise<void> {
    this.logger.log(`Recalculating price for ride ${data.rideId}`);

    // Recalcul avec Haversine
    const newDistKm = this.haversineKm(
      data.pickupLat, data.pickupLng,
      data.newDropoffLat, data.newDropoffLng,
    );

    // Charger la règle de prix depuis le cache Redis (ou fallback hardcodé)
    const pricing = await this.loadPricingFromCache(data.cityId, data.type);

    const rawPrice =
      pricing.baseFare +
      newDistKm * pricing.perKmRate +
      (newDistKm / 30) * 60 * pricing.perMinuteRate; // vitesse 30km/h

    const finalPrice = Math.max(
      pricing.minimumFare,
      Math.min(pricing.maximumFare ?? Infinity, rawPrice * pricing.surgeFactor),
    );

    // Prix final = prix course + frais de modification
    const totalPrice = Math.round((finalPrice + data.modificationFeeXof) / 5) * 5;

    // Mettre à jour le ride
    await this.rideRepo.update(data.rideId, {
      estimatedPrice: totalPrice,
      distanceKm: newDistKm,
    });

    // Mettre à jour le dernier log de modification avec le nouveau prix
    const logs = await this.logRepo.find({
      where: { rideId: data.rideId },
      order: { createdAt: 'DESC' },
      take: 1,
    });
    if (logs[0]) {
      await this.logRepo.update(logs[0].id, { newEstimatedPrice: totalPrice } as any);
    }

    // Ré-émettre RIDE_MODIFIED avec le prix recalculé
    await this.eventBus.emit(DomainEvents.RIDE_MODIFIED, {
      version: 1,
      rideId: data.rideId,
      field: 'estimated_price',
      oldValue: data.oldEstimatedPrice.toString(),
      newValue: totalPrice.toString(),
      newEstimatedPrice: totalPrice,
      modificationFeeXof: data.modificationFeeXof,
      timestamp: new Date(),
    } as any); // partiel — consommé par Notifications pour affichage uniquement

    this.logger.log(`Ride ${data.rideId} price recalculated: ${data.oldEstimatedPrice} → ${totalPrice} XOF`);
  }

  // ─── 2. Notifier le chauffeur ────────────────────────────────────────────────

  private async notifyDriver(data: NotifyDriverModificationJob): Promise<void> {
    this.logger.log(`Notifying driver ${data.driverId} of modification on ride ${data.rideId}`);

    // Déléguer au NotificationsService via event
    await this.eventBus.emit(DomainEvents.NOTIFICATION_PUSH_REQUESTED, {
      userId: data.driverId,
      title: 'Modification de course',
      body: `Destination modifiée : ${data.newValue}`,
      data: {
        type: 'ride_modification',
        rideId: data.rideId,
        changedField: data.changedField,
        oldValue: data.oldValue,
        newValue: data.newValue,
        requiresResponse: data.driverResponseTimeoutMs > 0,
        responseDeadline: data.driverResponseTimeoutMs > 0
          ? new Date(Date.now() + data.driverResponseTimeoutMs).toISOString()
          : null,
      },
    } as any);

    // Stocker dans Redis pour que le driver app puisse lire la demande
    if (data.driverResponseTimeoutMs > 0) {
      await this.redis.client.set(
        `modification:pending:${data.rideId}`,
        JSON.stringify({
          changedField: data.changedField,
          oldValue: data.oldValue,
          newValue: data.newValue,
          expiresAt: Date.now() + data.driverResponseTimeoutMs,
        }),
        'EX', Math.ceil(data.driverResponseTimeoutMs / 1000),
      );
    }
  }

  // ─── 3. Résolution conflit (timeout chauffeur) ────────────────────────────────

  private async resolveConflict(data: {
    rideId: string;
    driverId: string;
    reason: string;
    oldDropoffLat?: number;
    oldDropoffLng?: number;
  }): Promise<void> {
    const conflictKey    = `modification:conflict:${data.rideId}`;
    const pendingKey     = `modification:pending:${data.rideId}`;
    const conflictRaw    = await this.redis.client.get(conflictKey);

    if (!conflictRaw) {
      // Conflit déjà résolu (chauffeur a répondu avant le timeout)
      this.logger.debug(`Conflict for ride ${data.rideId} already resolved`);
      return;
    }

    const conflict = JSON.parse(conflictRaw) as { status: string };

    if (conflict.status !== 'pending') {
      // Le chauffeur a répondu — nettoyage
      await this.redis.client.del(conflictKey, pendingKey);
      return;
    }

    // ── Chauffeur n'a pas répondu ─────────────────────────────────────────────
    this.logger.warn(
      `Driver ${data.driverId} did not respond to modification of ride ${data.rideId}. Reason: ${data.reason}`
    );

    const ride = await this.rideRepo.findOne({ where: { id: data.rideId } });
    if (!ride) return;

    if (data.reason === 'implicit_accept') {
      // Course en cours → acceptation implicite de la nouvelle destination
      this.logger.log(`Implicit accept: driver ${data.driverId} continuing to new destination`);
      await this.eventBus.emit(DomainEvents.RIDE_MODIFIED, {
        version: 1,
        rideId: data.rideId,
        notes: 'driver_implicit_accept',
        timestamp: new Date(),
      } as any);
    } else {
      // Course en attente → re-dispatch avec ancien chauffeur libéré
      this.logger.log(`Driver ${data.driverId} timeout on modification — re-dispatching ride ${data.rideId}`);

      // Libérer le chauffeur et relancer la recherche
      await this.rideRepo.update(data.rideId, {
        driverId: null,
        status: RideStatus.SEARCHING,
        acceptedAt: null,
      } as any);

      await this.eventBus.emit(DomainEvents.RIDE_MODIFICATION_REFUSED as any, {
        version: 1,
        rideId: data.rideId,
        userId: ride.userId,
        driverId: data.driverId,
        timestamp: new Date(),
      });

      // Re-déclencher le dispatch
      await this.eventBus.emit(DomainEvents.RIDE_REQUESTED, {
        version: 1,
        rideId: data.rideId,
        userId: ride.userId,
        cityId: ride.cityId,
        pickupLat: Number(ride.pickupLat),
        pickupLng: Number(ride.pickupLng),
        type: ride.type,
        timestamp: new Date(),
      });
    }

    await this.redis.client.del(conflictKey, pendingKey);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async loadPricingFromCache(cityId: string, type: string): Promise<{
    baseFare: number; perKmRate: number; perMinuteRate: number;
    minimumFare: number; maximumFare: number | null; surgeFactor: number;
  }> {
    const cacheKey = `pricing:${cityId}:${type}`;
    const cached = await this.redis.client.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Fallback hardcodé (en prod: lire depuis DB + mettre en cache TTL 5min)
    const defaults: Record<string, { baseFare: number; perKmRate: number; perMinuteRate: number; minimumFare: number; maximumFare: number | null; surgeFactor: number }> = {
      moto:     { baseFare: 200, perKmRate: 150, perMinuteRate: 20, minimumFare: 500, maximumFare: 10000, surgeFactor: 1.0 },
      car:      { baseFare: 500, perKmRate: 250, perMinuteRate: 40, minimumFare: 1000, maximumFare: 20000, surgeFactor: 1.0 },
      carpool:  { baseFare: 150, perKmRate: 100, perMinuteRate: 15, minimumFare: 300, maximumFare: 7000,  surgeFactor: 1.0 },
      delivery: { baseFare: 300, perKmRate: 200, perMinuteRate: 30, minimumFare: 500, maximumFare: 15000, surgeFactor: 1.0 },
    };
    return defaults[type] ?? defaults['moto'];
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ─── Événements worker ───────────────────────────────────────────────────────

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${error.message}`);
  }
}
