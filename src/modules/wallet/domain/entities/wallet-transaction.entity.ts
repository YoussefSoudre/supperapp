import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

export enum TransactionType {
  CREDIT  = 'credit',
  DEBIT   = 'debit',
}

export enum TransactionReason {
  RIDE_PAYMENT       = 'ride_payment',
  RIDE_EARNING       = 'ride_earning',
  DELIVERY_PAYMENT   = 'delivery_payment',
  DELIVERY_EARNING   = 'delivery_earning',
  FOOD_PAYMENT       = 'food_payment',
  TOPUP              = 'topup',
  WITHDRAWAL         = 'withdrawal',
  REFERRAL_BONUS     = 'referral_bonus',
  PROMO_CREDIT       = 'promo_credit',
  REFUND             = 'refund',
  ADMIN_ADJUSTMENT   = 'admin_adjustment',
}

/**
 * Table: wallet_transactions
 * Immutable — jamais de UPDATE ni DELETE.
 * Reconstituable: SUM(amount WHERE type=credit) - SUM(amount WHERE type=debit) = balance
 *
 * PARTITIONNEMENT: RANGE (created_at) par mois
 * INDEX :
 *   - (wallet_id, created_at)      → historique wallet
 *   - (reference_id, reason)       → lien vers ride/payment
 *   - (wallet_id, type, created_at) → analytics
 */
@Entity('wallet_transactions')
@Index('idx_wtx_wallet',     ['walletId', 'createdAt'])
@Index('idx_wtx_reference',  ['referenceId', 'reason'])
@Index('idx_wtx_wallet_type', ['walletId', 'type', 'createdAt'])
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'wallet_id' })
  walletId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionReason })
  reason: TransactionReason;

  /** Montant en centimes */
  @Column({ type: 'bigint' })
  amount: number;

  /** Balance APRÈS transaction (dénormalisé pour perf d'affichage) */
  @Column({ type: 'bigint', name: 'balance_after' })
  balanceAfter: number;

  @Column({ length: 3, default: 'XOF' })
  currency: string;

  /** ID de la ride/order/payment liée */
  @Column({ type: 'uuid', nullable: true, name: 'reference_id' })
  referenceId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
