import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, OneToOne, OneToMany,
} from 'typeorm';

export enum UserStatus {
  ACTIVE     = 'active',
  INACTIVE   = 'inactive',
  SUSPENDED  = 'suspended',
  PENDING_KYC = 'pending_kyc',
}

/**
 * Table: users
 * Partitionnement recommandé : RANGE sur created_at par année (2M+ rows)
 * Index composites optimisés pour les queries fréquentes
 */
@Entity('users')
@Index('idx_users_phone',       ['phone'], { unique: true })
@Index('idx_users_email',       ['email'], { unique: true, where: '"email" IS NOT NULL' })
@Index('idx_users_referral',    ['referralCode'], { unique: true })
@Index('idx_users_city_status', ['cityId', 'status'])
@Index('idx_users_created',     ['createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  /** International format: +226XXXXXXXX */
  @Column({ length: 20, unique: true })
  phone: string;

  @Column({ length: 255, nullable: true, unique: true })
  email: string | null;

  @Column({ length: 255, select: false }) // jamais retourné en SELECT *
  passwordHash: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  /** Ville principale de l'utilisateur */
  @Column({ type: 'uuid', name: 'city_id' })
  cityId: string;

  /** Code unique généré à l'inscription: ex. YOUSSEF-K3P2 */
  @Column({ length: 20, unique: true, name: 'referral_code' })
  referralCode: string;

  /** Parrain optionnel */
  @Column({ type: 'uuid', nullable: true, name: 'referred_by_id' })
  referredById: string | null;

  @Column({ length: 255, nullable: true, name: 'avatar_url' })
  avatarUrl: string | null;

  /** Token FCM pour push notifications */
  @Column({ length: 500, nullable: true, name: 'fcm_token' })
  fcmToken: string | null;

  @Column({ type: 'boolean', default: false, name: 'phone_verified' })
  phoneVerified: boolean;

  @Column({ type: 'boolean', default: false, name: 'kyc_verified' })
  kycVerified: boolean;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt: Date | null;  // Soft delete
}
