import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';

/**
 * DriverLocationService — Gestion des positions GPS chauffeurs en temps réel.
 *
 * Stockage Redis :
 *   geo:drivers:{cityId}     → ZSET Geohash (GEORADIUS)
 *   driver:meta:{driverId}   → HASH metadata (rating, acceptRate, vehicleType)
 *
 * TTL = 10s sur metadata → chauffeur automatiquement offline si silence > 10s
 * Mise à jour : toutes les 3s côté mobile, avec throttle côté client :
 *   n'émettre que si déplacement > 30m OU silence > 3s
 *
 * Anti-surcharge Redis :
 *   - Pipeline batching : GEOADD + HSET + EXPIRE en 1 round-trip
 *   - Index GEO partitionné par ville (`geo:drivers:{cityId}`)
 *   - TTL implicite élimine les drivers inactifs sans cron
 */
@Injectable()
export class DriverLocationService {
  private readonly logger = new Logger(DriverLocationService.name);

  /** TTL metadata driver en secondes (doit être > intervalle update 3s) */
  private readonly DRIVER_META_TTL_S = 10;

  constructor(private readonly redis: RedisService) {}

  // ─── Clés Redis ─────────────────────────────────────────────────────────────

  /** Index géospatial par ville : geo:drivers:ouagadougou */
  private geoKey(cityId: string): string {
    return `geo:drivers:${cityId}`;
  }

  /** Metadata chauffeur : driver:meta:{driverId} */
  private metaKey(driverId: string): string {
    return `driver:meta:${driverId}`;
  }

  // ─── Mise à jour position (appelé par WebSocket gateway toutes les 3s) ──────

  /**
   * Met à jour la position GPS d'un chauffeur online.
   * Pipeline = 1 seul round-trip Redis pour 3 commandes.
   *
   * Commandes exécutées :
   *   GEOADD geo:drivers:{cityId} {lng} {lat} {driverId}
   *   HSET   driver:meta:{driverId} lat ... lng ... updatedAt ...
   *   EXPIRE driver:meta:{driverId} 10
   */
  async updateLocation(params: {
    driverId:    string;
    cityId:      string;
    lat:         number;
    lng:         number;
    rating?:     number;
    acceptRate?: number;
    vehicleType: string;
  }): Promise<void> {
    const pipeline = this.redis.client.pipeline();

    // 1. Mise à jour position géospatiale (Geohash ZSET)
    //    Ordre : lng, lat (convention GeoJSON)
    pipeline.geoadd(
      this.geoKey(params.cityId),
      params.lng,
      params.lat,
      params.driverId,
    );

    // 2. Metadata chauffeur pour enrichissement dispatch
    pipeline.hset(this.metaKey(params.driverId), {
      lat:         params.lat.toString(),
      lng:         params.lng.toString(),
      cityId:      params.cityId,
      vehicleType: params.vehicleType,
      rating:      (params.rating ?? 4.5).toString(),
      acceptRate:  (params.acceptRate ?? 0.8).toString(),
      updatedAt:   Date.now().toString(),
    });

    // 3. TTL 10s → offline implicite si l'app est coupée sans déconnexion
    pipeline.expire(this.metaKey(params.driverId), this.DRIVER_META_TTL_S);

    await pipeline.exec();
  }

  // ─── Passer offline (déconnexion propre) ────────────────────────────────────

  /**
   * Retire le chauffeur de l'index GEO et supprime ses metadata.
   * Appelé sur WebSocket disconnect ou changement status → offline.
   */
  async markOffline(driverId: string, cityId: string): Promise<void> {
    await Promise.all([
      this.redis.client.zrem(this.geoKey(cityId), driverId),
      this.redis.client.del(this.metaKey(driverId)),
    ]);
    this.logger.log(`Driver ${driverId} marked offline`);
  }

  // ─── Mise à jour taux d'acceptation ─────────────────────────────────────────

  /**
   * Met à jour le taux d'acceptation historique (EWMA).
   * Appelé de DriversService après chaque acceptation / refus.
   * EWMA : nouveauTaux = α×résultat + (1−α)×ancienTaux
   * avec α = 0.1 (lissage sur ~10 cours récentes)
   */
  async updateAcceptRate(driverId: string, accepted: boolean): Promise<void> {
    const meta = await this.redis.client.hgetall(this.metaKey(driverId));
    if (!meta?.acceptRate) return;

    const alpha      = 0.1;
    const oldRate    = parseFloat(meta.acceptRate);
    const newRate    = alpha * (accepted ? 1 : 0) + (1 - alpha) * oldRate;

    await this.redis.client.hset(
      this.metaKey(driverId),
      'acceptRate', newRate.toFixed(4),
    );
  }

  // ─── Recherche directe (fallback si DispatchService ne peut pas appeler Redis) ─

  /**
   * Trouver les chauffeurs disponibles dans un rayon donné.
   * Retourne les résultats bruts Redis GEORADIUS.
   * En production le DispatchService appelle directement Redis pour
   * éviter un hop réseau supplémentaire.
   */
  async findNearby(params: {
    cityId:   string;
    lat:      number;
    lng:      number;
    radiusKm: number;
    maxCount: number;
  }): Promise<Array<[string, string, [string, string]]>> {
    return this.redis.client.georadius(
      this.geoKey(params.cityId),
      params.lng,
      params.lat,
      params.radiusKm,
      'km',
      'ASC', 'COUNT', params.maxCount,
      'WITHCOORD', 'WITHDIST',
    ) as Promise<any>;
  }

  // ─── Métriques ──────────────────────────────────────────────────────────────

  /** Nombre de chauffeurs online dans une ville (taille du ZSET GEO) */
  async countOnline(cityId: string): Promise<number> {
    return this.redis.client.zcard(this.geoKey(cityId));
  }
}
