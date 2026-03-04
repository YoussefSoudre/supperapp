import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { ThrottlerModule } from '@nestjs/throttler';

// ─── Infrastructure ───────────────────────────────────────────────────────────
import { SharedModule } from './shared/shared.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

// ─── Feature Modules ─────────────────────────────────────────────────────────
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { RidesModule } from './modules/rides/rides.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { FoodModule } from './modules/food/food.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { ReferralModule } from './modules/referral/referral.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CitiesModule } from './modules/cities/cities.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';

// ─── Guards, Filters, Interceptors ────────────────────────────────────────────
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { PermissionGuard } from './shared/guards/permission.guard';
import { CityScopeGuard } from './shared/guards/city-scope.guard';

@Module({
  imports: [
    // ─── Config ─────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),

    // ─── Rate Limiting ───────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000,  limit: 10  },  // 10 req/sec
      { name: 'long',  ttl: 60000, limit: 200 },  // 200 req/min
    ]),

    // ─── Infrastructure ──────────────────────────────────────────────────────
    SharedModule,
    DatabaseModule,
    RedisModule,

    // ─── BullMQ (queue workers — connexion Redis partagée) ───────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host:     config.get<string>('REDIS_HOST', 'localhost'),
          port:     config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD'),
        },
      }),
    }),

    // ─── Domain Modules (ordre: pas de dépendances circulaires) ─────────────
    CitiesModule,        // aucune dépendance
    PricingModule,       // aucune dépendance
    AuthModule,          // dépend de UsersModule entities
    UsersModule,
    DriversModule,
    RidesModule,         // émet events → Wallet, Notification, Dispatch, Referral
    DeliveryModule,
    FoodModule,
    WalletModule,        // écoute payment.success, ride.completed
    PaymentsModule,      // émet payment.success
    ReferralModule,      // écoute user.registered, ride.completed
    NotificationsModule, // écoute tous les events
    AdminModule,
    AnalyticsModule,     // écoute tous les events en lecture seule
    DispatchModule,      // écoute ride.requested
    SchedulingModule,    // tâches cron
  ],
  providers: [
    { provide: APP_FILTER,      useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor   },
    // RBAC global guards — ordre d'exécution: JWT → Permission → CityScope
    { provide: APP_GUARD, useClass: JwtAuthGuard    },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_GUARD, useClass: CityScopeGuard  },
  ],
})
export class AppModule {}
