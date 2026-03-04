import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum PaymentStatus {
  PENDING   = 'pending',
  PROCESSING = 'processing',
  SUCCESS   = 'success',
  FAILED    = 'failed',
  REFUNDED  = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentProvider {
  ORANGE_MONEY = 'orange_money',
  MOOV_MONEY   = 'moov_money',
  CORIS_BANK   = 'coris_bank',
  WALLET       = 'wallet',       // paiement via wallet interne
  CASH         = 'cash',
}

export enum PaymentServiceType {
  RIDE     = 'ride',
  DELIVERY = 'delivery',
  FOOD     = 'food',
  WALLET_TOPUP = 'wallet_topup',
  WITHDRAWAL   = 'withdrawal',
}

/**
 * Table: payments
 * Table GÉNÉRIQUE — supporte tous les services sans modification.
 * Ajout d'un nouveau service = ajout d'une valeur dans PaymentServiceType uniquement.
 *
 * PARTITIONNEMENT : RANGE (created_at)
 * INDEX :
 *   - (user_id, status, created_at)      → historique paiements user
 *   - (reference_id, service_type)       → lien vers ride/food/delivery
 *   - (provider_tx_id)                   → réconciliation avec opérateur
 *   - (status) WHERE status IN (pending, processing) → tâches de monitoring
 */
@Entity('payments')
@Index('idx_payments_user',       ['userId', 'status', 'createdAt'])
@Index('idx_payments_reference',  ['referenceId', 'serviceType'])
@Index('idx_payments_provider_tx', ['providerTxId'], { where: '"provider_tx_id" IS NOT NULL' })
@Index('idx_payments_pending',    ['status', 'createdAt'], { where: '"status" IN (\'pending\', \'processing\')' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: PaymentServiceType, name: 'service_type' })
  serviceType: PaymentServiceType;

  /** ID du ride/order/delivery concerné */
  @Column({ type: 'uuid', name: 'reference_id' })
  referenceId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'XOF' })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  /** Numéro de téléphone mobile money */
  @Column({ length: 20, nullable: true, name: 'provider_phone' })
  providerPhone: string | null;

  /** Transaction ID retourné par l'opérateur */
  @Column({ length: 255, nullable: true, name: 'provider_tx_id' })
  providerTxId: string | null;

  /** Réponse brute de l'opérateur (audit) */
  @Column({ type: 'jsonb', nullable: true, name: 'provider_response' })
  providerResponse: Record<string, unknown> | null;

  @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
  paidAt: Date | null;

  @Column({ type: 'integer', default: 0, name: 'retry_count' })
  retryCount: number;

  @Column({ type: 'text', nullable: true, name: 'failure_reason' })
  failureReason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
