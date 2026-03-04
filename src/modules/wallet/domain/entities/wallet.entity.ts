import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum WalletStatus {
  ACTIVE  = 'active',
  FROZEN  = 'frozen',
  CLOSED  = 'closed',
}

/**
 * Table: wallets
 * Une entrée par utilisateur. Balance en centimes (integer) pour éviter
 * les erreurs de virgule flottante.
 *
 * IMPORTANT: Toute mise à jour de balance DOIT passer par une transaction SQL
 * avec SELECT FOR UPDATE pour garantir la cohérence.
 */
@Entity('wallets')
@Index('idx_wallets_user', ['userId'], { unique: true })
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId: string;

  /**
   * Balance en centimes XOF (1 XOF = 1 centimes dans ce système)
   * Avantage: calculs en INTEGER, jamais de problème FLOAT
   * Ex: 5000 XOF → stored as 500000
   */
  @Column({ type: 'bigint', default: 0 })
  balance: number;

  @Column({ length: 3, default: 'XOF' })
  currency: string;

  @Column({ type: 'enum', enum: WalletStatus, default: WalletStatus.ACTIVE })
  status: WalletStatus;

  /** Limite de retrait journalière en centimes */
  @Column({ type: 'bigint', default: 10000000, name: 'daily_withdrawal_limit' })
  dailyWithdrawalLimit: number;

  @Column({ type: 'integer', default: 0, name: 'version' })
  version: number; // Optimistic locking

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
