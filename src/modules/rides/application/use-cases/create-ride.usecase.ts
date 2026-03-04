import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { RIDE_REPOSITORY, IRideRepository } from '../../domain/interfaces/ride-repository.interface';
import { CreateRideDto } from '../dto/create-ride.dto';
import { RideStatus } from '../../domain/entities/ride.entity';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { DomainEvents } from '../../../../shared/events/domain-events.constants';
import { Ride } from '../../domain/entities/ride.entity';

@Injectable()
export class CreateRideUseCase {
  constructor(
    @Inject(RIDE_REPOSITORY)
    private readonly rideRepo: IRideRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(userId: string, cityId: string, dto: CreateRideDto): Promise<Ride> {
    // Vérification: l'utilisateur n'a pas déjà une course active
    const existingRides = await this.rideRepo.findByUserId(userId, {
      filters: { status: [RideStatus.PENDING, RideStatus.SEARCHING, RideStatus.IN_PROGRESS] },
    });

    if (existingRides.total > 0) {
      throw new BadRequestException('You already have an active ride');
    }

    const status = dto.scheduledAt ? RideStatus.SCHEDULED : RideStatus.PENDING;

    const ride = await this.rideRepo.save({
      userId,
      cityId,
      driverId: null,
      type: dto.type,
      status,
      pickupAddress: dto.pickupAddress,
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      dropoffAddress: dto.dropoffAddress,
      dropoffLat: dto.dropoffLat,
      dropoffLng: dto.dropoffLng,
      estimatedPrice: 0,      // calculé par PricingService en amont
      finalPrice: null,
      currency: 'XOF',
      surgeFactor: 1.0,
      pricingRuleId: null,
      distanceKm: null,
      durationSeconds: null,
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      cancelledBy: null,
      cancellationReason: null,
      paymentId: null,
      isPaid: false,
      userRating: null,
      driverRating: null,
      userComment: null,
      metadata: null,
      modificationCount: 0,
      modificationFeeTotalXof: 0,
    });

    const eventName = dto.scheduledAt ? DomainEvents.RIDE_SCHEDULED : DomainEvents.RIDE_REQUESTED;
    await this.eventBus.emit(eventName, {
      version: 1,
      rideId: ride.id,
      userId,
      cityId,
      type: dto.type,
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      scheduledAt: dto.scheduledAt,
      timestamp: new Date(),
    });

    return ride;
  }
}
