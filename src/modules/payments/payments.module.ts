import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './domain/entities/payment.entity';
import { CityPaymentConfig } from './domain/entities/city-payment-config.entity';
import { PaymentsController } from './presentation/payments.controller';
import { PaymentsService } from './application/payments.service';
import { OrangeMoneyProvider } from './infrastructure/providers/orange-money.provider';
import { MoovMoneyProvider } from './infrastructure/providers/moov-money.provider';

/**
 * PaymentsModule — Orchestrateur de paiements multi-providers.
 * Pattern Strategy: chaque provider est un IPaymentProvider injectable.
 * Ajout d'un nouveau provider = 1 fichier, 0 modification du service.
 * Émet: payment.initiated, payment.success, payment.failed
 */
@Module({
  imports: [TypeOrmModule.forFeature([Payment, CityPaymentConfig])],
  controllers: [PaymentsController],
  providers: [PaymentsService, OrangeMoneyProvider, MoovMoneyProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
