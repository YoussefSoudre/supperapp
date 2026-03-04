import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { ReferralProgram } from './domain/entities/referral-program.entity';
import { ReferralUsage } from './domain/entities/referral-usage.entity';
import { ReferralRewardLog } from './domain/entities/referral-reward-log.entity';
import { User } from '../users/domain/entities/user.entity';

// Services
import { AntiAbuseService } from './application/anti-abuse.service';
import { ReferralRewardService } from './application/referral-reward.service';
import { ReferralService } from './application/referral.service';

// Controller
import { ReferralController } from './presentation/referral.controller';

// Wallet (import du module pour injecter WalletService)
import { WalletModule } from '../wallet/wallet.module';

/**
 * ReferralModule — Système de parrainage scalable.
 *
 * Architecture :
 *   ReferralService      → orchestre les événements (USER_REGISTERED, RIDE/DELIVERY/FOOD COMPLETED)
 *   AntiAbuseService     → 6 contrôles anti-fraude (self, device, IP, téléphone, cap parrain)
 *   ReferralRewardService→ attribution idempotente via WalletService + RewardLog
 *
 * Flux événement :
 *   user.registered        → onUserRegistered → crée ReferralUsage
 *   ride.completed         → onRideCompleted  → incrémente trips → reward si seuil atteint
 *   delivery.completed     → onDeliveryCompleted (même logique)
 *   food.order.delivered   → onFoodOrderDelivered (même logique)
 *
 * Extensibilité :
 *   • Ajouter un service : implémenter @OnEvent(DomainEvents.NEW_SERVICE_COMPLETED)
 *   • Modifier les règles : INSERT dans referral_programs (cityId, serviceTypes, antiAbuseConfig…)
 *   • Activer/désactiver  : PATCH /referral/admin/programs/:id/toggle
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReferralProgram,
      ReferralUsage,
      ReferralRewardLog,
      User,
    ]),
    WalletModule,
  ],
  controllers: [ReferralController],
  providers: [
    AntiAbuseService,
    ReferralRewardService,
    ReferralService,
  ],
  exports: [ReferralService],
})
export class ReferralModule {}

