import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './presentation/analytics.controller';
import { AnalyticsService } from './application/analytics.service';
import { AdminModule } from '../admin/admin.module';
import { Ride } from '../rides/domain/entities/ride.entity';
import { Driver } from '../drivers/domain/entities/driver.entity';
import { User } from '../users/domain/entities/user.entity';
import { FoodOrder } from '../food/domain/entities/food-order.entity';
import { Restaurant } from '../food/domain/entities/restaurant.entity';
import { Delivery } from '../delivery/domain/entities/delivery.entity';
import { Payment } from '../payments/domain/entities/payment.entity';

/**
 * AnalyticsModule — KPIs, rapports, dashboards.
 * Requêtes DB directes (lecture seule) pour les statistiques en temps réel.
 * Scoped par ville pour les city_admins et managers.
 * En production: pourrait être séparé en microservice dédié (read replica).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Ride, Driver, User, FoodOrder, Restaurant, Delivery, Payment]),
    AdminModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
