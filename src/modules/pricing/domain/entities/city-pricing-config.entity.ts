import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { PricingServiceType } from './pricing-rule.entity';
import { RuleKey } from '../constants/rule-keys.constants';
import { RuleConditions } from '../interfaces/rule-conditions.interface';

/**
 * CityPricingConfig — Configuration par ville/service/règle.
 *
 * Chaque enregistrement représente UNE règle activée pour UNE ville + UN service.
 * La colonne `params` (JSONB) contient les paramètres propres à la règle (montants, taux…).
 * La colonne `conditions` (JSONB) filtre l'activation (horaire, jours, passagers, etc.)
 *
 * Ajouter une règle (ex: majoration météo) :
 *   1. Créer le handler WeatherSurchargeRule
 *   2. Insérer une ligne dans cette table avec ruleKey = 'weather_surcharge'
 *   ➜  ZERO modification du code existant.
 *
 * Table : city_pricing_configs
 */
@Entity('city_pricing_configs')
@Index('idx_cpc_city_service_active', ['cityId', 'serviceType', 'isActive'])
@Index('idx_cpc_city_service_priority', ['cityId', 'serviceType', 'priority'])
export class CityPricingConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Ville concernée */
  @Column({ type: 'uuid', name: 'city_id' })
  cityId: string;

  /** Type de service (moto, car, carpool, delivery, food) */
  @Column({ type: 'enum', enum: PricingServiceType, name: 'service_type' })
  serviceType: PricingServiceType;

  /**
   * Clé de la règle — correspond à IPricingRuleHandler.key et à RULE_KEYS.
   * Exemples : 'base_fare', 'per_km', 'surge', 'dynamic_surge', 'carpool_discount',
   *            'platform_commission', 'cancellation_fee', …
   */
  @Column({ length: 60, name: 'rule_key' })
  ruleKey: RuleKey | string;

  /** Nom humain pour l'interface admin */
  @Column({ length: 120 })
  name: string;

  /**
   * Paramètres JSONB spécifiques à la règle.
   * Exemples :
   *   base_fare          → { amount: 500 }
   *   per_km             → { ratePerKm: 150, minimumFare: 700, maximumFare: 15000, currency: 'XOF' }
   *   surge              → { multiplier: 1.5 }
   *   dynamic_surge      → { peakHours: [{start:7,end:9},{start:17,end:20}], peakMultiplier: 1.4,
   *                           demandThreshold: 1.2, demandMultiplierMax: 2.0 }
   *   carpool_discount   → { discountPerPassenger: 0.10, maxPassengers: 4 }
   *   platform_commission→ { rate: 0.15 }
   *   cancellation_fee   → { amount: 500 }
   */
  @Column({ type: 'jsonb', default: '{}' })
  params: Record<string, unknown>;

  /**
   * Conditions d'activation JSONB — si null, la règle s'applique toujours.
   * Voir RuleConditions pour la structure complète.
   */
  @Column({ type: 'jsonb', nullable: true })
  conditions: RuleConditions | null;

  /**
   * Ordre d'exécution dans le pipeline (ASC = premier).
   * Règles de base : 1-10 | Surge : 20-30 | Réductions : 40-50 | Commission : 90
   */
  @Column({ type: 'integer', default: 10 })
  priority: number;

  /** Activation / désactivation sans suppression */
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
