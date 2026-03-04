import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Driver, DriverStatus } from '../domain/entities/driver.entity';
import { DomainEvents } from '../../../shared/events/domain-events.constants';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { RideRatedPayload } from '../../../shared/events/domain-events.constants';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly repo: Repository<Driver>,
    private readonly eventBus: EventBusService,
    private readonly redis: RedisService,
  ) {}

  async findByUserId(userId: string): Promise<Driver> {
    const driver = await this.repo.findOne({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');
    return driver;
  }

  async findAvailableNear(lat: number, lng: number, radiusKm: number, cityId: string): Promise<Driver[]> {
    // Utilise une formule Haversine en SQL pour trouver les chauffeurs proches
    return this.repo
      .createQueryBuilder('driver')
      .where('driver.status = :status', { status: DriverStatus.ONLINE })
      .andWhere('driver.cityId = :cityId', { cityId })
      .andWhere(`
        (6371 * acos(
          cos(radians(:lat)) * cos(radians(driver.lastLat)) *
          cos(radians(driver.lastLng) - radians(:lng)) +
          sin(radians(:lat)) * sin(radians(driver.lastLat))
        )) < :radius`,
        { lat, lng, radius: radiusKm }
      )
      .orderBy('driver.rating', 'DESC')
      .limit(10)
      .getMany();
  }

  async setOnline(userId: string): Promise<void> {
    const driver = await this.findByUserId(userId);
    await this.repo.update(driver.id, { status: DriverStatus.ONLINE });
    await this.eventBus.emit(DomainEvents.DRIVER_WENT_ONLINE, {
      version: 1, driverId: driver.id, cityId: driver.cityId, timestamp: new Date(),
    });
  }

  async setOffline(userId: string): Promise<void> {
    const driver = await this.findByUserId(userId);
    await this.repo.update(driver.id, { status: DriverStatus.OFFLINE });
    await this.eventBus.emit(DomainEvents.DRIVER_WENT_OFFLINE, {
      version: 1, driverId: driver.id, timestamp: new Date(),
    });
  }

  @OnEvent(DomainEvents.DRIVER_LOCATION_UPDATED)
  async handleLocationUpdate(payload: { driverId: string; lat: number; lng: number }): Promise<void> {
    await this.repo.update(
      { id: payload.driverId },
      { lastLat: payload.lat, lastLng: payload.lng, lastSeenAt: new Date() }
    );
  }

  /**
   * Quand un passager note une course, synchronise la nouvelle moyenne du chauffeur
   * dans le hash Redis driver:meta:{driverId}.
   * Le DispatchService lit ce hash lors du scoring → la note est prise en compte
   * dès le prochain dispatch, sans attendre un redémarrage ou un rechargement.
   */
  @OnEvent(DomainEvents.RIDE_RATED)
  async handleRideRated(payload: RideRatedPayload): Promise<void> {
    // Seule la note du passager (sur le chauffeur) impacte le score dispatch
    if (payload.ratedBy !== 'passenger' || !payload.ratedId) return;

    const driver = await this.repo.findOne({ where: { id: payload.ratedId } });
    if (!driver) return;

    // Mettre à jour le hash Redis utilisé par DispatchService
    await this.redis.client.hset(`driver:meta:${driver.id}`, {
      rating:     String(driver.rating),        // valeur déjà mise à jour par RateRideUseCase
      acceptRate: String(0.8),                  // TODO: calculer acceptRate réel depuis les offres
      vehicleType: driver.vehicleType,
      updatedAt:  new Date().toISOString(),
    });
  }
}
