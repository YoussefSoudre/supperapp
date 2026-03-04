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
import { ModifyRideBeforeDepartureDto } from '../../presentation/dto/modify-ride.dto';
import { QUEUES, JOBS } from '../queues/ride-queues.constants';
import { RedisService } from '../../../../infrastructure/redis/redis.service';

/**
 * States dans lesquels une modification avant départ est autorisée
 * avec leurs règles spécifiques.
 *
 * SCHEDULED    → modifiable sans restriction (pas de chauffeur)
 * PENDING      → modifiable sans restriction (pas de chauffeur)
 * SEARCHING    → modifiable sans restriction (pas de chauffeur)
 * ACCEPTED     → modifiable si acceptedAt < 5 minutes (grace period)
 *                → le chauffeur doit être notifié et peut refuser
 * DRIVER_EN_ROUTE → interdit (chauffeur déjà en route)
 * IN_PROGRESS  → utiliser ModifyRideEnRouteUseCase à la place
 */
const MODIFIABLE_STATUSES_PRE_DEPARTURE = [
  RideStatus.SCHEDULED,
  RideStatus.PENDING,
  RideStatus.SEARCHING,
  RideStatus.ACCEPTED,
];

/** Délai de grâce après acceptation (ms) : 5 minutes */
const DRIVER_ACCEPTED_GRACE_MS = 5 * 60 * 1000;

/** Frais de modification par défaut (centimes XOF) — écrasé par config ville */
const DEFAULT_MODIFICATION_FEE_XOF = 0;

@Injectable()
export class ModifyRideBeforeDepartureUseCase {
  private readonly logger = new Logger(ModifyRideBeforeDepartureUseCase.name);

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
    dto: ModifyRideBeforeDepartureDto,
  ): Promise<{ rideId: string; modificationFeeXof: number; newEstimatedPrice: number }> {

    // ── 1. Charger la course ──────────────────────────────────────────────────
    const ride = await this.rideRepo.findById(rideId);
    if (!ride) throw new NotFoundException(`Ride ${rideId} not found`);

    // ── 2. Vérification d'appartenance ────────────────────────────────────────
    if (ride.userId !== userId) {
      throw new ForbiddenException('You can only modify your own rides');
    }

    // ── 3. Validation de la machine à états ──────────────────────────────────
    this.assertModifiable(ride);

    // ── 4. Valider que dto contient au moins un champ modifiable ─────────────
    if (!dto.newDropoffAddress && !dto.newDropoffLat && !dto.newDropoffLng && !dto.newScheduledAt) {
      throw new BadRequestException('At least one field to modify must be provided');
    }

    // ── 5. Frais de modification (lire depuis Redis config ville) ─────────────
    const modificationFeeXof = await this.getModificationFee(ride.cityId, ride.status);

    // ── 6. Déterminer la phase ────────────────────────────────────────────────
    const phase = ride.status === RideStatus.ACCEPTED
      ? ModificationPhase.PRE_DEPARTURE
      : ModificationPhase.PRE_ACCEPTANCE;

    // ── 7. Appliquer les modifications au ride ────────────────────────────────
    const updates: Partial<typeof ride> = {
      modificationCount: (ride.modificationCount ?? 0) + 1,
      modificationFeeTotalXof: (ride.modificationFeeTotalXof ?? 0) + modificationFeeXof,
    };

    if (dto.newDropoffAddress) updates.dropoffAddress = dto.newDropoffAddress;
    if (dto.newDropoffLat !== undefined) updates.dropoffLat = dto.newDropoffLat;
    if (dto.newDropoffLng !== undefined) updates.dropoffLng = dto.newDropoffLng;
    if (dto.newScheduledAt) {
      const newDate = new Date(dto.newScheduledAt);
      this.assertFutureDate(newDate, 'newScheduledAt');
      updates.scheduledAt = newDate;
    }

    await this.rideRepo.update(rideId, updates);

    // ── 8. Persister le log d'audit (immuable) ────────────────────────────────
    const changedField = dto.newDropoffAddress
      ? ModificationField.DROPOFF_ADDRESS
      : ModificationField.SCHEDULED_AT;

    const oldValue = changedField === ModificationField.DROPOFF_ADDRESS
      ? ride.dropoffAddress
      : (ride.scheduledAt?.toISOString() ?? 'none');

    const newValue = changedField === ModificationField.DROPOFF_ADDRESS
      ? dto.newDropoffAddress!
      : dto.newScheduledAt!;

    await this.rideRepo.saveModificationLog({
      rideId,
      modifiedById: userId,
      field: changedField,
      phase,
      oldValue,
      newValue,
      modificationFeeXof,
      rideStatusAtModification: ride.status,
      oldEstimatedPrice: Number(ride.estimatedPrice),
      newEstimatedPrice: Number(ride.estimatedPrice), // mis à jour par le worker
      reason: dto.reason ?? null,
    });

    // ── 9. Enqueue recalcul prix asynchrone ──────────────────────────────────
    const finalLat = dto.newDropoffLat ?? ride.dropoffLat;
    const finalLng = dto.newDropoffLng ?? ride.dropoffLng;

    await this.modificationQueue.add(
      JOBS.RECALCULATE_PRICE,
      {
        rideId,
        cityId: ride.cityId,
        newDropoffLat: Number(finalLat),
        newDropoffLng: Number(finalLng),
        pickupLat: Number(ride.pickupLat),
        pickupLng: Number(ride.pickupLng),
        type: ride.type,
        oldEstimatedPrice: Number(ride.estimatedPrice),
        modificationFeeXof,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );

    // ── 10. Edge case — conflits chauffeur assigné ────────────────────────────
    // Si le chauffeur est déjà assigné (ACCEPTED) et la destination change
    // de façon significative (> 1km), notifier le chauffeur.
    if (ride.status === RideStatus.ACCEPTED && ride.driverId && dto.newDropoffLng) {
      const detourKm = this.haversineKm(
        ride.dropoffLat, ride.dropoffLng, Number(finalLat), Number(finalLng),
      );
      if (detourKm > 1.0) {
        await this.handleDriverConflict(rideId, ride.driverId, userId, changedField, oldValue, newValue);
      }
    }

    // ── 11. Émettre RIDE_MODIFIED (consommé par NotificationsService) ─────────
    await this.eventBus.emit(DomainEvents.RIDE_MODIFIED, {
      version: 1,
      rideId,
      userId,
      driverId: ride.driverId,
      cityId: ride.cityId,
      field: changedField,
      oldValue,
      newValue,
      rideStatus: ride.status,
      modificationFeeXof,
      newEstimatedPrice: Number(ride.estimatedPrice), // mis à jour par worker
      timestamp: new Date(),
    });

    this.logger.log(`Ride ${rideId} modified by user ${userId}: ${changedField}`);

    return {
      rideId,
      modificationFeeXof,
      newEstimatedPrice: Number(ride.estimatedPrice),
    };
  }

  // ─── Helpers privés ─────────────────────────────────────────────────────────

  private assertModifiable(ride: { status: RideStatus; acceptedAt: Date | null }): void {
    if (!MODIFIABLE_STATUSES_PRE_DEPARTURE.includes(ride.status)) {
      throw new BadRequestException(
        `Cannot modify a ride with status "${ride.status}". ` +
        `Allowed: ${MODIFIABLE_STATUSES_PRE_DEPARTURE.join(', ')}`
      );
    }

    // Edge case : chauffeur accepté depuis plus de 5 minutes → trop tard
    if (ride.status === RideStatus.ACCEPTED && ride.acceptedAt) {
      const elapsed = Date.now() - ride.acceptedAt.getTime();
      if (elapsed > DRIVER_ACCEPTED_GRACE_MS) {
        throw new BadRequestException(
          'Cannot modify ride after 5 minutes of driver acceptance. ' +
          'Contact support or cancel the ride.'
        );
      }
    }
  }

  private assertFutureDate(date: Date, field: string): void {
    const minAdvanceMs = 10 * 60 * 1000; // min 10 min dans le futur
    if (date.getTime() < Date.now() + minAdvanceMs) {
      throw new BadRequestException(
        `${field} must be at least 10 minutes in the future`
      );
    }
  }

  /**
   * Lire le frais de modification depuis Redis.
   * Clé: city:{cityId}:modification_fee
   * Valeur: centimes XOF (integer)
   * Configurable via AdminService.setCityConfig()
   *
   * Politique de frais recommandée:
   *   SCHEDULED / PENDING / SEARCHING → 0 XOF (avant assignation)
   *   ACCEPTED                        → 200 XOF (a été assigné à un chauffeur)
   */
  private async getModificationFee(cityId: string, status: RideStatus): Promise<number> {
    // Chauffeur pas encore assigné → gratuit par défaut
    if (status !== RideStatus.ACCEPTED) return 0;

    const raw = await this.redis.client.get(`city:${cityId}:modification_fee`);
    return raw ? parseInt(raw, 10) : DEFAULT_MODIFICATION_FEE_XOF;
  }

  /**
   * Notifier le chauffeur d'une modification significative.
   * Le chauffeur a 2 minutes pour refuser → sinon modification acceptée implicitement.
   */
  private async handleDriverConflict(
    rideId: string,
    driverId: string,
    userId: string,
    field: ModificationField,
    oldValue: string,
    newValue: string,
  ): Promise<void> {
    const conflictKey = `modification:conflict:${rideId}`;

    // Stocker le conflit dans Redis avec TTL 2 minutes
    await this.redis.client.set(
      conflictKey,
      JSON.stringify({ status: 'pending', driverId, rideId }),
      'EX', 120, // 2 minutes
    );

    // Notifier le chauffeur via job asynchrone
    await this.modificationQueue.add(
      JOBS.NOTIFY_DRIVER_MODIFICATION,
      {
        rideId,
        driverId,
        userId,
        changedField: field,
        oldValue,
        newValue,
        driverResponseTimeoutMs: 120_000,
      },
      {
        attempts: 2,
        removeOnComplete: true,
      },
    );

    // Job de résolution du conflit si le chauffeur ne répond pas
    await this.modificationQueue.add(
      JOBS.RESOLVE_DRIVER_CONFLICT,
      { rideId, driverId, reason: 'driver_no_response' },
      {
        delay: 120_000, // déclenché après 2 minutes si pas de réponse
        attempts: 2,
        removeOnComplete: true,
      },
    );
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
