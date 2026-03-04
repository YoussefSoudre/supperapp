import { Module } from '@nestjs/common';
import { DispatchService } from './application/dispatch.service';
import { DriverLocationService } from './application/driver-location.service';
import { TrackingGateway } from './presentation/tracking.gateway';
import { RedisModule } from '../../infrastructure/redis/redis.module';

/**
 * DispatchModule — Moteur d'attribution chauffeur/ride.
 *
 * Architecture :
 *   - DriverLocationService  → met à jour Redis GEO + metadata TTL
 *   - DispatchService        → GEORADIUS + scoring + waterfall offres
 *
 * Scalabilité horizontale via Redis Streams (Consumer Group).
 * Chaque instance NestJS consomme exclusivement ses rides assignés.
 *
 * Score = 0.5×proximité + 0.3×note + 0.2×taux_acceptation
 */
@Module({
  imports: [RedisModule],
  providers: [DispatchService, DriverLocationService, TrackingGateway],
  exports: [DispatchService, DriverLocationService, TrackingGateway],
})
export class DispatchModule {}
