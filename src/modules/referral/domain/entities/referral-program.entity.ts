import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum RewardType {
  WALLET_CREDIT = 'wallet_credit',
  DISCOUNT      = 'discount',
  FREE_RIDE     = 'free_ride',
}

export type ReferralServiceType = 'ride' | 'food' | 'delivery';

/**
 * AntiAbuseConfig — Paramètres de protection contre les abus.
 * Stocké en JSONB dans ReferralProgram.antiAbuseConfig.
 */
export interface AntiAbuseConfig {
  /** Nombre maximum de filleuls par parrain (anti-fermes) */
  maxFilleulsPerReferrer: number;
  /** Délai minimum (jours) entre inscription filleul et trip déclencheur */
  minAccountAgeDays: number;
  /** Montant minimum de la commande déclencheur (centimes XOF) */
  minTriggerAmountXof: number;
  /** Nombre max d'inscriptions depuis la même IP IPv4/24 */
  maxUsersPerSubnet: number;
  /** Réutilisation du même device fingerprint bloquée */
  blockSameDevice: boolean;
  /** Délai (jours) d'expiration de l'usage PENDING sans trip */
  pendingExpiryDays: number;
}

/**
 * Table: referral_programs
 * Définit les règles de parrainage configurables par ville et par service.
 *
 * Chaque programme peut cibler 1..N services (ride, food, delivery).
 * Les montants sont en centimes XOF.
 * null cityId = programme global (fallback si aucune règle ville spécifique).
 */
@Entity('referral_programs')
@Index('idx_rp_city_active',   ['cityId', 'isActive'])
@Index('idx_rp_global_active', ['isActive'])
export class ReferralProgram {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  /** null = global (toutes les villes); sinon UUID de la ville */
  @Column({ type: 'uuid', nullable: true, name: 'city_id' })
  cityId: string | null;

  /**
   * Services auxquels ce programme s'applique.
   * Ex: ['ride', 'food', 'delivery'] = tous les services
   */
  @Column({ type: 'jsonb', default: "['ride']", name: 'service_types' })
  serviceTypes: ReferralServiceType[];

  // ── Récompense parrain ────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: RewardType, name: 'referrer_reward_type' })
  referrerRewardType: RewardType;

  /** Montant en centimes XOF (wallet_credit) ou taux × 100 (discount = 1500 → 15%) */
  @Column({ type: 'bigint', name: 'referrer_reward_amount' })
  referrerRewardAmount: number;

  /** Plafond lifetime rewards pour un parrain (0 = illimité) */
  @Column({ type: 'integer', default: 0, name: 'max_rewards_per_referrer' })
  maxRewardsPerReferrer: number;

  // ── Récompense filleul ────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: RewardType, name: 'referee_reward_type' })
  refereeRewardType: RewardType;

  @Column({ type: 'bigint', name: 'referee_reward_amount' })
  refereeRewardAmount: number;

  // ── Déclencheur ───────────────────────────────────────────────────────────

  /** Nombre minimum de trips pour déclencher le reward */
  @Column({ type: 'integer', default: 1, name: 'trigger_after_trips' })
  triggerAfterTrips: number;

  /** Montant minimum de la commande déclencheur (centimes XOF, 0 = aucun) */
  @Column({ type: 'bigint', default: 0, name: 'min_trigger_amount_xof' })
  minTriggerAmountXof: number;

  // ── Anti-abus ─────────────────────────────────────────────────────────────

  /**
   * Paramètres anti-abus JSONB.
   * Voir AntiAbuseConfig pour la structure complète.
   */
  @Column({ type: 'jsonb', name: 'anti_abuse_config', default: '{}' })
  antiAbuseConfig: AntiAbuseConfig;

  // ── Durée ─────────────────────────────────────────────────────────────────

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt: Date | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
