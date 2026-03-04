import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';
import { ReferralServiceType } from './referral-program.entity';

export enum ReferralUsageStatus {
  PENDING   = 'pending',
  COMPLETED = 'completed',
  REWARDED  = 'rewarded',
  EXPIRED   = 'expired',
  ABORTED   = 'aborted',  // annulé suite à détection abus
}

/**
 * Table: referral_usages
 * Une ligne par couple (parrain → filleul). Immutable après création sauf status/tripsCompleted.
 *
 * Contrainte DB clé : referee_id UNIQUE → un seul parrain par utilisateur (1:1).
 * Index référents pour les lookups fréquents en lecture.
 */
@Entity('referral_usages')
@Index('idx_ru_referrer',     ['referrerId', 'status'])
@Index('idx_ru_referee',      ['refereeId'],   { unique: true })
@Index('idx_ru_program',      ['programId'])
@Index('idx_ru_city_program', ['cityId', 'programId'])
export class ReferralUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'program_id' })
  programId: string;

  @Column({ type: 'uuid', name: 'city_id' })
  cityId: string;

  @Column({ type: 'uuid', name: 'referrer_id' })
  referrerId: string;

  /** UNIQUE — un utilisateur ne peut avoir qu'un seul parrain */
  @Column({ type: 'uuid', name: 'referee_id', unique: true })
  refereeId: string;

  @Column({ type: 'enum', enum: ReferralUsageStatus, default: ReferralUsageStatus.PENDING })
  status: ReferralUsageStatus;

  /** Nombre de trips validés par le filleul depuis l'inscription */
  @Column({ type: 'integer', default: 0, name: 'trips_completed' })
  tripsCompleted: number;

  /**
   * Service qui a déclenché le reward (peut différer du service d'inscription).
   * null tant que status = PENDING.
   */
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'trigger_service_type' })
  triggerServiceType: ReferralServiceType | null;

  /** ID de la commande/course qui a atteint le seuil */
  @Column({ type: 'uuid', nullable: true, name: 'trigger_order_id' })
  triggerOrderId: string | null;

  // ── Anti-abus ─────────────────────────────────────────────────────────────

  /** Empreinte device filleul à l'inscription (hash SHA256 de user-agent + platform) */
  @Column({ length: 64, nullable: true, name: 'device_fingerprint' })
  deviceFingerprint: string | null;

  /** IPv4 ou IPv6 d'inscription du filleul */
  @Column({ length: 45, nullable: true, name: 'registration_ip' })
  registrationIp: string | null;

  /** Préfixe téléphonique /24 subnet pour détection SIM farm (226XXXXXXX → 226XXX) */
  @Column({ length: 20, nullable: true, name: 'phone_prefix' })
  phonePrefix: string | null;

  // ── Timestamps ─────────────────────────────────────────────────────────────

  @Column({ type: 'timestamp', nullable: true, name: 'rewarded_at' })
  rewardedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
