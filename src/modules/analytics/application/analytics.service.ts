import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvents, RideCompletedPayload } from '../../../shared/events/domain-events.constants';

/**
 * AnalyticsService — Agrégation passive d'événements.
 * Ne modifie jamais le domaine. Lecture seule des events.
 * Stocke dans des tables analytics dénormalisées (ou TimescaleDB en prod).
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  // Compteurs en mémoire (remplacer par TimescaleDB/ClickHouse en prod)
  private metrics = {
    totalRides: 0, totalRevenue: 0, ridesByCity: {} as Record<string, number>,
  };

  @OnEvent(DomainEvents.RIDE_COMPLETED)
  onRideCompleted(payload: RideCompletedPayload): void {
    this.metrics.totalRides++;
    this.metrics.totalRevenue += payload.amount;
    this.metrics.ridesByCity[payload.cityId] = (this.metrics.ridesByCity[payload.cityId] ?? 0) + 1;
    this.logger.debug(`Analytics: ride completed in ${payload.cityId}, total rides: ${this.metrics.totalRides}`);
  }

  getMetrics() {
    return {
      totalRides: this.metrics.totalRides,
      totalRevenueXOF: this.metrics.totalRevenue,
      ridesByCity: this.metrics.ridesByCity,
    };
  }
}
