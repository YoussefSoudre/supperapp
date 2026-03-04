import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from './domain/entities/driver.entity';
import { DriversController } from './presentation/drivers.controller';
import { DriversService } from './application/drivers.service';
import { RedisModule } from '../../infrastructure/redis/redis.module';

/**
 * DriversModule — Profil conducteur, disponibilité, documents, géolocalisation.
 * Écoute: driver.location.updated → met à jour last_lat/last_lng
 * Écoute: ride.rated            → synchronise la note dans Redis (dispatch score)
 * Émet:   driver.online, driver.offline
 */
@Module({
  imports: [TypeOrmModule.forFeature([Driver]), RedisModule],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
