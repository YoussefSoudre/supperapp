import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';
import { ReferralServiceType } from './referral-program.entity';

export enum RewardLogStatus {
  PENDING  = 'pending',   // en attente de traitement
  GRANTED  = 'granted',   // wallet crédité
  FAILED   = 'failed',    // erreur lors du crédit
  REVERSED = 'reversed',  // annulé (abus détecté a posteriori)
}

export enum RewardRecipientRole {
  REFERRER = 'referrer',  // parrain
  REFEREE  = 'referee',   // filleul
}

/**
 * Table: referral_reward_logs
 * Journal immuable de chaque récompense de parrainage.
 *
 * Objectifs :
 *   1. Idempotence : empêcher le double-crédit (UNIQUE idempotency_key)
 *   2. Tracking ROI par ville/programme/service
 *   3. Audit trail pour reversals
 *
 * REQUÊTES ROI typiques :
 *   - SUM(amount_xof) GROUP BY city_id, service_type → coût total parrainage
 *   - COUNT(*) / SUM(amount_xof) GROUP BY program_id → conversion rate
 *   - AVG(days_to_trigger) GROUP BY city_id           → vitesse activation
 */
@Entity('referral_reward_logs')
@Index('idx_rrl_usage',           ['referralUsageId'])
@Index('idx_rrl_referrer',        ['referrerId', 'createdAt'])
@Index('idx_rrl_referee',         ['refereeId'])
@Index('idx_rrl_city_service',    ['cityId', 'serviceType', 'createdAt'])
@Index('idx_rrl_program',         ['programId', 'createdAt'])
@Index('idx_rrl_idempotency',     ['idempotencyKey'], { unique: true })
export class ReferralRewardLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Relations ─────────────────────────────────────────────────────────────

  @Column({ type: 'uuid', name: 'referral_usage_id' })
  referralUsageId: string;

  @Column({ type: 'uuid', name: 'program_id' })
  programId: string;

  @Column({ type: 'uuid', name: 'city_id' })
  cityId: string;

  @Column({ type: 'uuid', name: 'referrer_id' })
  referrerId: string;

  @Column({ type: 'uuid', name: 'referee_id' })
  refereeId: string;

  /**
   * Bénéficiaire de cette ligne de récompense.
   * Une récompense produit 2 logs : un pour le parrain, un pour le filleul.
   */
  @Column({ type: 'uuid', name: 'recipient_id' })
  recipientId: string;

  @Column({
    type: 'enum',
    enum: RewardRecipientRole,
    name: 'recipient_role',
  })
  recipientRole: RewardRecipientRole;

  // ── Commande déclencheuse ─────────────────────────────────────────────────

  /** ID de la course/commande/livraison qui a déclenché la récompense */
  @Column({ type: 'uuid', name: 'trigger_order_id' })
  triggerOrderId: string;

  @Column({ type: 'varchar', length: 20, name: 'service_type' })
  serviceType: ReferralServiceType;

  // ── Montant ───────────────────────────────────────────────────────────────

  /** Montant crédité en centimes XOF */
  @Column({ type: 'bigint', name: 'amount_xof' })
  amountXof: number;

  /** Référence de la transaction wallet créée */
  @Column({ type: 'uuid', nullable: true, name: 'wallet_tx_id' })
  walletTxId: string | null;

  // ── Statut ────────────────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: RewardLogStatus,
    default: RewardLogStatus.PENDING,
  })
  status: RewardLogStatus;

  @Column({ length: 255, nullable: true, name: 'failure_reason' })
  failureReason: string | null;

  // ── Idempotence ───────────────────────────────────────────────────────────

  /**
   * Clé d'idempotence : `${referralUsageId}:${recipientRole}`
   * Garantit l'unicité : un usage ne peut générer qu'un reward par rôle.
   */
  @Column({ length: 120, name: 'idempotency_key' })
  idempotencyKey: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
