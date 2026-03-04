import {
  Injectable, Inject, NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RIDE_REPOSITORY, IRideRepository } from '../../domain/interfaces/ride-repository.interface';
import { RideStatus } from '../../domain/entities/ride.entity';
import { Driver } from '../../../drivers/domain/entities/driver.entity';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { DomainEvents } from '../../../../shared/events/domain-events.constants';
import { Ride } from '../../domain/entities/ride.entity';

export interface RateRideParams {
  rideId: string;
  /** ID du demandeur : passager → note le chauffeur ; chauffeur → note le passager */
  requesterId: string;
  /** Note entre 1 et 5 */
  rating: number;
  comment?: string;
}

@Injectable()
export class RateRideUseCase {
  constructor(
    @Inject(RIDE_REPOSITORY)
    private readonly rideRepo: IRideRepository,

    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,

    private readonly eventBus: EventBusService,
  ) {}

  async execute({ rideId, requesterId, rating, comment }: RateRideParams): Promise<Ride> {
    // ── Validations ───────────────────────────────────────────────────────
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new BadRequestException('Rating must be an integer between 1 and 5');
    }

    const ride = await this.rideRepo.findById(rideId);
    if (!ride) throw new NotFoundException('Ride not found');

    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException('Only completed rides can be rated');
    }

    const isPassenger = requesterId === ride.userId;
    const isDriver    = ride.driverId !== null && requesterId === ride.driverId;

    if (!isPassenger && !isDriver) {
      throw new BadRequestException('You are not a participant of this ride');
    }

    // ── Empêcher la double notation ───────────────────────────────────────
    if (isPassenger && ride.userRating !== null) {
      throw new BadRequestException('You have already rated this ride');
    }
    if (isDriver && ride.driverRating !== null) {
      throw new BadRequestException('You have already rated this ride');
    }

    // ── Mettre à jour la course ───────────────────────────────────────────
    const updatePayload: Partial<Ride> = isPassenger
      ? { userRating: rating, userComment: comment ?? null }
      : { driverRating: rating };

    const updated = await this.rideRepo.update(rideId, updatePayload);

    // ── Mettre à jour la note moyenne rolling du chauffeur ────────────────
    // Uniquement quand c'est le passager qui note (note du chauffeur)
    if (isPassenger && ride.driverId) {
      await this.updateDriverRating(ride.driverId, rating);
    }

    // ── Event ─────────────────────────────────────────────────────────────
    await this.eventBus.emit(DomainEvents.RIDE_RATED, {
      version:   1,
      rideId,
      ratedBy:   isPassenger ? 'passenger' : 'driver',
      raterId:   requesterId,
      ratedId:   isPassenger ? ride.driverId : ride.userId,
      rating,
      comment:   comment ?? null,
      timestamp: new Date(),
    });

    return updated;
  }

  /**
   * Recalcule la note moyenne du chauffeur en tenant compte de toutes ses courses notées.
   * Formule rolling : nouvelle_moyenne = (ancienne × totalTrips + nouvelle_note) / (totalTrips + 1)
   * Plus précis qu'une moyenne simple sur un sous-ensemble limité.
   */
  private async updateDriverRating(driverId: string, newRating: number): Promise<void> {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) return;

    const totalRated = driver.totalTrips > 0 ? driver.totalTrips : 1;
    const newAvg = ((driver.rating * totalRated) + newRating) / (totalRated + 1);

    await this.driverRepo.update(driverId, {
      // Arrondir à 2 décimales — correspond à la précision de la colonne DECIMAL(3,2)
      rating:     Math.min(5.0, Math.max(1.0, Math.round(newAvg * 100) / 100)),
      totalTrips: driver.totalTrips + 1,
    });
  }
}
