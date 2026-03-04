import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { RIDE_REPOSITORY, IRideRepository } from '../../domain/interfaces/ride-repository.interface';
import { RideStatus } from '../../domain/entities/ride.entity';
import { canTransitionTo } from '../../domain/value-objects/ride-status.vo';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { DomainEvents, RideCompletedPayload } from '../../../../shared/events/domain-events.constants';
import { Ride } from '../../domain/entities/ride.entity';

@Injectable()
export class CompleteRideUseCase {
  constructor(
    @Inject(RIDE_REPOSITORY)
    private readonly rideRepo: IRideRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(rideId: string, finalPrice: number): Promise<Ride> {
    const ride = await this.rideRepo.findById(rideId);
    if (!ride) throw new NotFoundException('Ride not found');

    if (!canTransitionTo(ride.status, RideStatus.COMPLETED)) {
      throw new BadRequestException(`Cannot complete ride in status: ${ride.status}`);
    }

    const updated = await this.rideRepo.update(rideId, {
      status: RideStatus.COMPLETED,
      finalPrice,
      completedAt: new Date(),
    });

    // Émettre l'event — Wallet, Notification, Referral réagiront sans couplage
    const payload: RideCompletedPayload = {
      version: 1,
      rideId,
      driverId: ride.driverId!,
      userId: ride.userId,
      amount: finalPrice,
      currency: ride.currency,
      cityId: ride.cityId,
      serviceType: ride.type as 'moto' | 'car' | 'carpool',
      surgeApplied: ride.surgeFactor > 1.0,
      timestamp: new Date(),
    };

    await this.eventBus.emit(DomainEvents.RIDE_COMPLETED, payload);

    return updated;
  }
}
