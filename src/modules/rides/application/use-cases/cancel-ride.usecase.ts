import {
  Injectable, Inject, NotFoundException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { RIDE_REPOSITORY, IRideRepository } from '../../domain/interfaces/ride-repository.interface';
import { RideStatus, RideCancelledBy } from '../../domain/entities/ride.entity';
import { canTransitionTo } from '../../domain/value-objects/ride-status.vo';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { DomainEvents } from '../../../../shared/events/domain-events.constants';
import { Ride } from '../../domain/entities/ride.entity';

export interface CancelRideParams {
  rideId: string;
  /** ID de l'utilisateur qui fait la demande (passager, chauffeur ou admin) */
  requesterId: string;
  reason?: string;
}

@Injectable()
export class CancelRideUseCase {
  constructor(
    @Inject(RIDE_REPOSITORY)
    private readonly rideRepo: IRideRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute({ rideId, requesterId, reason }: CancelRideParams): Promise<Ride> {
    const ride = await this.rideRepo.findById(rideId);
    if (!ride) throw new NotFoundException('Ride not found');

    // ── Vérifier que la transition vers CANCELLED est valide ──────────────
    if (!canTransitionTo(ride.status, RideStatus.CANCELLED)) {
      throw new BadRequestException(
        `Cannot cancel a ride in status: ${ride.status}. ` +
        `Only pending, searching, accepted, driver_en_route, arrived and scheduled rides can be cancelled.`,
      );
    }

    // ── Déterminer qui annule ─────────────────────────────────────────────
    let cancelledBy: RideCancelledBy;
    if (requesterId === ride.userId) {
      cancelledBy = RideCancelledBy.USER;
    } else if (ride.driverId && requesterId === ride.driverId) {
      cancelledBy = RideCancelledBy.DRIVER;
    } else {
      // Admins pourront appeler ce use case via le service admin — on accepte
      cancelledBy = RideCancelledBy.ADMIN;
    }

    // ── Mettre à jour la course ───────────────────────────────────────────
    const updated = await this.rideRepo.update(rideId, {
      status: RideStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy,
      cancellationReason: reason ?? null,
    });

    // ── Émettre l'event — Wallet, Notifications, Dispatch réagiront ───────
    await this.eventBus.emit(DomainEvents.RIDE_CANCELLED, {
      version: 1,
      rideId,
      userId:      ride.userId,
      driverId:    ride.driverId,
      cityId:      ride.cityId,
      cancelledBy,
      reason:      reason ?? null,
      rideStatus:  ride.status,          // statut avant annulation
      timestamp:   new Date(),
    });

    return updated;
  }
}
