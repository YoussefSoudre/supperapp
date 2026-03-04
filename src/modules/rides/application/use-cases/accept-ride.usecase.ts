import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { RIDE_REPOSITORY, IRideRepository } from '../../domain/interfaces/ride-repository.interface';
import { RideStatus } from '../../domain/entities/ride.entity';
import { canTransitionTo } from '../../domain/value-objects/ride-status.vo';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { DomainEvents } from '../../../../shared/events/domain-events.constants';
import { Ride } from '../../domain/entities/ride.entity';

@Injectable()
export class AcceptRideUseCase {
  constructor(
    @Inject(RIDE_REPOSITORY)
    private readonly rideRepo: IRideRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(rideId: string, driverId: string): Promise<Ride> {
    const ride = await this.rideRepo.findById(rideId);
    if (!ride) throw new NotFoundException('Ride not found');

    if (!canTransitionTo(ride.status, RideStatus.ACCEPTED)) {
      throw new BadRequestException(`Cannot accept a ride in status: ${ride.status}`);
    }

    const activeRides = await this.rideRepo.countActiveRidesByDriver(driverId);
    if (activeRides > 0) {
      throw new BadRequestException('Driver already has an active ride');
    }

    const updated = await this.rideRepo.update(rideId, {
      driverId,
      status: RideStatus.ACCEPTED,
      acceptedAt: new Date(),
    });

    await this.eventBus.emit(DomainEvents.RIDE_ACCEPTED, {
      version: 1,
      rideId,
      driverId,
      userId: ride.userId,
      cityId: ride.cityId,
      timestamp: new Date(),
    });

    return updated;
  }
}
