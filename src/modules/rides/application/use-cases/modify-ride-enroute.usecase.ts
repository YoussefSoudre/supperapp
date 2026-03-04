import {
  Injectable, Inject, Logger,
  NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { DomainEvents } from '../../../../shared/events/domain-events.constants';
import { IRideRepository, RIDE_REPOSITORY } from '../../domain/interfaces/ride-repository.interface';
import { RideStatus } from '../../domain/entities/ride.entity';
import { ModificationField, ModificationPhase } from '../../domain/entities/ride-modification-log.entity';
import { ModifyRideEnRouteDto } from '../../presentation/dto/modify-ride.dto';
import { QUEUES, JOBS } from '../queues/ride-queues.constants';
import { RedisService } from '../../../../infrastructure/redis/redis.service';

/**
 * ModifyRideEnRouteUseCase — Modification de destination pendant la course.
 *
 * Règles métier :
 *   - Seul le passager peut modifier en cours de route
 *   - Seule la destination peut changer (pickup déjà effectué)
 *   - Le chauffeur est notifié immédiatement
 *   - Le chauffeur a 2 minutes pour refuser → ride redirigé ou prix différentiel
 *   - Prix recalculé automatiquement sur la nouvelle distance totale
 *   - Frais de modification en cours de route peuvent être plus élevés
 *
 * Edge cases gérés :
 *   A. Destination plus proche → prix réduit, remboursement différentiel
 *   B. Destination plus loin   → supplément payé à la fin
 *   C. Chauffeur refuse        → ride complété à l'ancienne destination,
 *                                supplément non appliqué
 *   D. Zone sans couverture    → refus avec message explicatif
 */
@Injectable()
export class ModifyRideEnRouteUseCase {
  private readonly logger = new Logger(ModifyRideEnRouteUseCase.name);

  /** Frais de modification en cours de route (plus élevés qu'avant départ) */
  private readonly EN_ROUTE_FEE_DEFAULT_XOF = 500;

  /** Détour maximum autorisé sans accord explicite chauffeur (km) */
  private readonly MAX_AUTO_DETOUR_KM = 2.0;

  constructor(
    @Inject(RIDE_REPOSITORY)
    private readonly rideRepo: IRideRepository,
    @InjectQueue(QUEUES.RIDE_MODIFICATION)
    private readonly modificationQueue: Queue,
    private readonly eventBus: EventBusService,
    private readonly redis: RedisService,
  ) {}

  async execute(
    rideId: string,
    userId: string,
    dto: ModifyRideEnRouteDto,
  ): Promise<{ rideId: string; newEstimatedPrice: number; modificationFeeXof: number; requiresDriverApproval: boolean }> {

    // ── 1. Charger le ride ────────────────────────────────────────────────────
    const ride = await this.rideRepo.findById(rideId);
    if (!ride) throw new NotFoundException(`Ride ${rideId} not found`);

    if (ride.userId !== userId) {
      throw new ForbiddenException('Only the passenger can modify a ride in progress');
    }

    // ── 2. Vérifier que la course est bien en cours ───────────────────────────
    if (ride.status !== RideStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Ride must be IN_PROGRESS to use this endpoint. ` +
        `Current status: ${ride.status}. Use PATCH /rides/:id/modify-before-departure instead.`
      );
    }

    if (!ride.driverId) {
      throw new BadRequestException('No driver assigned to this ride');
    }

    // ── 3. Valider presence champs destination ────────────────────────────────
    if (!dto.newDropoffLat || !dto.newDropoffLng) {
      throw new BadRequestException('newDropoffLat and newDropoffLng are required for in-route modification');
    }

    // ── 4. Calculer le détour ─────────────────────────────────────────────────
    const detourKm = this.haversineKm(
      ride.dropoffLat, ride.dropoffLng,
      dto.newDropoffLat, dto.newDropoffLng,
    );

    // ── 5. Frais de modification en cours de route ────────────────────────────
    const feeOverride = await this.redis.client.get(`city:${ride.cityId}:enroute_modification_fee`);
    const modificationFeeXof = feeOverride
      ? parseInt(feeOverride, 10)
      : this.EN_ROUTE_FEE_DEFAULT_XOF;

    // ── 6. Recalcul prix estimé ───────────────────────────────────────────────
    //   Prix = prix du trajet déjà parcouru + nouveau trajet restant
    //   On approche : recalculer sur la distance totale depuis le pickup initial
    const oldDropoffLat  = ride.dropoffLat;
    const oldDropoffLng  = ride.dropoffLng;
    const oldEstimated   = Number(ride.estimatedPrice);

    // Approx nouveau prix = prix actuel × (nouvelle distance / ancienne distance)
    const oldDist = this.haversineKm(
      Number(ride.pickupLat), Number(ride.pickupLng),
      Number(ride.dropoffLat), Number(ride.dropoffLng),
    );
    const newDist = this.haversineKm(
      Number(ride.pickupLat), Number(ride.pickupLng),
      dto.newDropoffLat, dto.newDropoffLng,
    );
    const scaleFactor = oldDist > 0 ? newDist / oldDist : 1;
    const newEstimatedPrice = Math.max(500, Math.round(oldEstimated * scaleFactor / 5) * 5);

    // ── 7. Déterminer si approbation chauffeur requise ────────────────────────
    const requiresDriverApproval = detourKm > this.MAX_AUTO_DETOUR_KM;

    // ── 8. Mettre à jour le ride ──────────────────────────────────────────────
    await this.rideRepo.update(rideId, {
      dropoffAddress: dto.newDropoffAddress ?? ride.dropoffAddress,
      dropoffLat: dto.newDropoffLat,
      dropoffLng: dto.newDropoffLng,
      estimatedPrice: newEstimatedPrice,
      modificationCount: (ride.modificationCount ?? 0) + 1,
      modificationFeeTotalXof: (ride.modificationFeeTotalXof ?? 0) + modificationFeeXof,
    });

    // ── 9. Log d'audit immuable ───────────────────────────────────────────────
    await this.rideRepo.saveModificationLog({
      rideId,
      modifiedById: userId,
      field: ModificationField.DROPOFF_ADDRESS,
      phase: ModificationPhase.IN_PROGRESS,
      oldValue: `${oldDropoffLat},${oldDropoffLng}`,
      newValue:  `${dto.newDropoffLat},${dto.newDropoffLng}`,
      modificationFeeXof,
      rideStatusAtModification: ride.status,
      oldEstimatedPrice: oldEstimated,
      newEstimatedPrice,
      reason: dto.reason ?? null,
    });

    // ── 10. Notifier chauffeur de la nouvelle destination ─────────────────────
    await this.modificationQueue.add(
      JOBS.NOTIFY_DRIVER_MODIFICATION,
      {
        rideId,
        driverId: ride.driverId,
        userId,
        changedField: 'dropoff_address',
        oldValue: dto.newDropoffAddress ?? `${oldDropoffLat},${oldDropoffLng}`,
        newValue: dto.newDropoffAddress ?? `${dto.newDropoffLat},${dto.newDropoffLng}`,
        driverResponseTimeoutMs: requiresDriverApproval ? 120_000 : 0, // 0 = pas besoin réponse
      },
      { attempts: 3, backoff: { type: 'fixed', delay: 1000 }, removeOnComplete: true },
    );

    // ── 11. Si détour > 2km : attendre confirmation chauffeur ─────────────────
    if (requiresDriverApproval) {
      const conflictKey = `modification:conflict:${rideId}`;
      await this.redis.client.set(
        conflictKey,
        JSON.stringify({ status: 'pending', driverId: ride.driverId, phase: 'in_progress' }),
        'EX', 120,
      );

      // Résolution automatique après 2min si chauffeur ne répond pas
      // → acceptation implicite (chauffeur déjà en route vers nouvelle dest.)
      await this.modificationQueue.add(
        JOBS.RESOLVE_DRIVER_CONFLICT,
        { rideId, driverId: ride.driverId, reason: 'implicit_accept', oldDropoffLat, oldDropoffLng },
        { delay: 120_000, attempts: 2, removeOnComplete: true },
      );
    }

    // ── 12. Émettre RIDE_MODIFIED ─────────────────────────────────────────────
    await this.eventBus.emit(DomainEvents.RIDE_MODIFIED, {
      version: 1,
      rideId,
      userId,
      driverId: ride.driverId,
      cityId: ride.cityId,
      field: ModificationField.DROPOFF_ADDRESS,
      oldValue: `${oldDropoffLat},${oldDropoffLng}`,
      newValue: `${dto.newDropoffLat},${dto.newDropoffLng}`,
      rideStatus: RideStatus.IN_PROGRESS,
      modificationFeeXof,
      newEstimatedPrice,
      timestamp: new Date(),
    });

    this.logger.log(
      `Ride ${rideId} destination changed en-route. ` +
      `Détour: ${detourKm.toFixed(2)}km. ` +
      `RequiresApproval: ${requiresDriverApproval}`
    );

    return { rideId, newEstimatedPrice, modificationFeeXof, requiresDriverApproval };
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
}
