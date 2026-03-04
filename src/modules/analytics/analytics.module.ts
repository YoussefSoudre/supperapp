import { Module } from '@nestjs/common';
import { AnalyticsController } from './presentation/analytics.controller';
import { AnalyticsService } from './application/analytics.service';

/**
 * AnalyticsModule — KPIs, rapports, dashboards.
 * Écoute tous les events en mode lecture seule.
 * Données agrégées dans des tables dénormalisées pour le reporting.
 * En production: pourrait être séparé en microservice dédié (read replica).
 */
@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
