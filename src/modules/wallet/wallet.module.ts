import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './domain/entities/wallet.entity';
import { WalletTransaction } from './domain/entities/wallet-transaction.entity';
import { WalletController } from './presentation/wallet.controller';
import { WalletService } from './application/wallet.service';

/**
 * WalletModule — Solde interne, transactions, retraits.
 * Écoute: payment.success, ride.completed, referral.reward.granted
 * Émet: wallet.credited, wallet.debited, wallet.withdrawal.requested
 * IMPORTANT: Toute opération de balance utilise des transactions DB atomiques.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletTransaction])],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
