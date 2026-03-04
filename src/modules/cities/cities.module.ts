import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from './domain/entities/city.entity';
import { CitiesController } from './presentation/cities.controller';
import { CitiesService } from './application/cities.service';

/**
 * CitiesModule — Référentiel des villes opérationnelles.
 * Données fréquemment lues, mises en cache Redis (TTL: 1h).
 * Étendu facilement: ajout countyId pour multi-pays futur.
 */
@Module({
  imports: [TypeOrmModule.forFeature([City])],
  controllers: [CitiesController],
  providers: [CitiesService],
  exports: [CitiesService],
})
export class CitiesModule {}
