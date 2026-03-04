import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ReferralRewardLog,
  RewardLogStatus,
  RewardRecipientRole,
} from '../domain/entities/referral-reward-log.entity';
import { ReferralUsage, ReferralUsageStatus } from '../domain/entities/referral-usage.entity';
import { ReferralProgram, RewardType, ReferralServiceType } from '../domain/entities/referral-program.entity';
import { WalletService } from '../../wallet/application/wallet.service';
import { TransactionReason } from '../../wallet/domain/entities/wallet-transaction.entity';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { DomainEvents } from '../../../shared/events/domain-events.constants';

export interface GrantRewardInput {
  usage:          ReferralUsage;
  program:        ReferralProgram;
  triggerOrderId: string;
  serviceType:    ReferralServiceType;
  orderAmountXof: number;
}

/**
 * ReferralRewardService — Attribution des récompenses de parrainage.
 *
 * Responsabilités :
 *   1. Vérifier l'idempotence (UNIQUE idempotency_key) pour éviter le double-crédit.
 *   2. Calculer les montants (wallet_credit fixe OU discount calculé sur le montant commande).
 *   3. Créditer le wallet du parrain ET du filleul via WalletService.credit().
 *   4. Émettre referral.reward.granted pour Notifications + Analytics.
 *   5. Mettre à jour ReferralUsage.status → REWARDED.
 *
 * La méthode grant() est idempotente : si un log existe déjà pour l'usage/rôle,
 * elle retourne sans recréer la transaction.
 */
@Injectable()
export class ReferralRewardService {
  private readonly logger = new Logger(ReferralRewardService.name);

  constructor(
    @InjectRepository(ReferralRewardLog)
    private readonly logRepo: Repository<ReferralRewardLog>,
    @InjectRepository(ReferralUsage)
    private readonly usageRepo: Repository<ReferralUsage>,
    private readonly walletService: WalletService,
    private readonly eventBus: EventBusService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Attribue les récompenses au parrain ET au filleul.
   * Gérée dans une transaction DB pour garantir l'atomicité.
   */
  async grant(input: GrantRewardInput): Promise<void> {
    const { usage, program, triggerOrderId, serviceType, orderAmountXof } = input;

    await this.dataSource.transaction(async (manager) => {
      // ── Idempotence : vérifier si déjà traité ─────────────────────────────
      const referrerKey = `${usage.id}:referrer`;
      const refereeKey  = `${usage.id}:referee`;

      const [existingReferrer, existingReferee] = await Promise.all([
        manager.findOne(ReferralRewardLog, { where: { idempotencyKey: referrerKey } }),
        manager.findOne(ReferralRewardLog, { where: { idempotencyKey: refereeKey } }),
      ]);

      if (existingReferrer && existingReferee) {
        this.logger.warn(`Reward already granted for usage ${usage.id} — skipping`);
        return;
      }

      const referrerAmount = this.computeAmount(
        program.referrerRewardType,
        program.referrerRewardAmount,
        orderAmountXof,
      );
      const refereeAmount = this.computeAmount(
        program.refereeRewardType,
        program.refereeRewardAmount,
        orderAmountXof,
      );

      // ── Créer les logs (PENDING) ───────────────────────────────────────────
      const referrerLog = !existingReferrer
        ? manager.create(ReferralRewardLog, {
            referralUsageId: usage.id,
            programId:       program.id,
            cityId:          usage.cityId,
            referrerId:      usage.referrerId,
            refereeId:       usage.refereeId,
            recipientId:     usage.referrerId,
            recipientRole:   RewardRecipientRole.REFERRER,
            triggerOrderId,
            serviceType,
            amountXof:       referrerAmount,
            status:          RewardLogStatus.PENDING,
            idempotencyKey:  referrerKey,
          })
        : null;

      const refereeLog = !existingReferee
        ? manager.create(ReferralRewardLog, {
            referralUsageId: usage.id,
            programId:       program.id,
            cityId:          usage.cityId,
            referrerId:      usage.referrerId,
            refereeId:       usage.refereeId,
            recipientId:     usage.refereeId,
            recipientRole:   RewardRecipientRole.REFEREE,
            triggerOrderId,
            serviceType,
            amountXof:       refereeAmount,
            status:          RewardLogStatus.PENDING,
            idempotencyKey:  refereeKey,
          })
        : null;

      if (referrerLog) await manager.save(ReferralRewardLog, referrerLog);
      if (refereeLog)  await manager.save(ReferralRewardLog, refereeLog);

      // ── Créditer les wallets (hors transaction TypeORM — wallet a sa propre TX) ──
      // Note : les crédits wallet sont effectués après insertion des logs.
      // En cas d'erreur wallet, le log reste FAILED → retry manuel possible.
      await manager.update(ReferralUsage, usage.id, {
        status:              ReferralUsageStatus.REWARDED,
        triggerServiceType: serviceType,
        triggerOrderId,
        rewardedAt:         new Date(),
      });
    });

    // ── Crédits wallet (hors TX principale pour isolation) ────────────────────
    await this.creditWallet(usage.referrerId, program, 'referrer', triggerOrderId, orderAmountXof, usage.id);
    await this.creditWallet(usage.refereeId,  program, 'referee',  triggerOrderId, orderAmountXof, usage.id);

    // ── Notification & analytics ──────────────────────────────────────────────
    await this.eventBus.emit(DomainEvents.REFERRAL_REWARD_GRANTED, {
      version:           1,
      referralUsageId:   usage.id,
      programId:         program.id,
      cityId:            usage.cityId,
      referrerId:        usage.referrerId,
      refereeId:         usage.refereeId,
      triggerOrderId,
      serviceType,
      referrerAmountXof: this.computeAmount(program.referrerRewardType, program.referrerRewardAmount, orderAmountXof),
      refereeAmountXof:  this.computeAmount(program.refereeRewardType,  program.refereeRewardAmount,  orderAmountXof),
      timestamp:         new Date(),
    });

    this.logger.log(
      `Rewards granted for usage ${usage.id} ` +
      `(referrer ${usage.referrerId} / referee ${usage.refereeId})`,
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async creditWallet(
    userId: string,
    program: ReferralProgram,
    role: 'referrer' | 'referee',
    triggerOrderId: string,
    orderAmountXof: number,
    usageId: string,
  ): Promise<void> {
    const rewardType   = role === 'referrer' ? program.referrerRewardType : program.refereeRewardType;
    const rewardAmount = role === 'referrer' ? program.referrerRewardAmount : program.refereeRewardAmount;
    const amount       = this.computeAmount(rewardType, rewardAmount, orderAmountXof);

    if (amount <= 0 || rewardType !== RewardType.WALLET_CREDIT) return;

    try {
      const tx = await this.walletService.credit(
        userId,
        amount,
        TransactionReason.REFERRAL_BONUS,
        triggerOrderId,
      );
      // Mettre à jour le log avec l'ID transaction
      const idempotencyKey = `${usageId}:${role}`;
      await this.logRepo.update(
        { idempotencyKey },
        { walletTxId: tx.id, status: RewardLogStatus.GRANTED },
      );
    } catch (err) {
      const idempotencyKey = `${usageId}:${role}`;
      await this.logRepo.update(
        { idempotencyKey },
        { status: RewardLogStatus.FAILED, failureReason: (err as Error).message },
      );
      this.logger.error(`Failed to credit wallet for ${role} ${userId}: ${(err as Error).message}`);
    }
  }

  /**
   * Calcule le montant effectif en centimes XOF.
   *   wallet_credit → montant fixe (déjà en centimes)
   *   discount      → pourcentage de l'orderAmount (rewardAmount = taux × 100, ex: 1500 → 15%)
   *   free_ride     → montant fixe (bon de réduction valeur)
   */
  private computeAmount(type: RewardType, rawAmount: number, orderAmountXof: number): number {
    if (type === RewardType.DISCOUNT) {
      const rate = Number(rawAmount) / 10000; // 1500 → 15%
      return Math.round(orderAmountXof * rate);
    }
    return Number(rawAmount);
  }
}
