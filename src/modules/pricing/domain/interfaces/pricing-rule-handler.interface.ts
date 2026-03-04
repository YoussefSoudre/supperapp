import { PriceBreakdownBuilder } from '../value-objects/price-breakdown.builder';
import { CityPricingConfig } from '../entities/city-pricing-config.entity';
import { PricingServiceType } from '../entities/pricing-rule.entity';

/**
 * RichPricingContext — Contexte enrichi transmis au moteur de pricing.
 *
 * Ajout de champs futurs (ex: weatherCondition, eventId) ici suffit
 * pour les exposer à toutes les règles existantes et futures.
 */
export interface RichPricingContext {
  cityId: string;
  serviceType: PricingServiceType;

  // ── Métriques de trajet ───────────────────────────────────────────────────
  distanceKm: number;
  durationMinutes: number;

  // ── Temporel ─────────────────────────────────────────────────────────────
  hour: number;          // 0-23 (heure locale)
  dayOfWeek: number;     // 1=Lundi … 7=Dimanche

  // ── Covoiturage ───────────────────────────────────────────────────────────
  passengersCount?: number;   // ≥ 2 pour activer la règle covoiturage

  // ── Annulation ────────────────────────────────────────────────────────────
  isCancellation?: boolean;

  // ── Demand / Offre ────────────────────────────────────────────────────────
  /**
   * Ratio demande/offre calculé par le DispatchService.
   *   < 1.0 → offre suffisante
   *   1.0   → équilibre
   *   > 1.0 → tension (surge déclenché selon seuil configuré)
   */
  demandFactor?: number;

  // ── Contextes futurs (non-breaking — les règles existantes les ignorent) ──
  weatherCondition?: string;   // ex: 'clear', 'rain', 'storm'
  eventProximityKm?: number;   // distance en km vers un événement majeur

  /** Métadonnées arbitraires pour des extensions sans modifier l'interface */
  metadata?: Record<string, unknown>;
}

/**
 * IPricingRuleHandler — Contrat que chaque règle de pricing doit implémenter.
 *
 * Pattern : Strategy + Registry
 * • L'implémentation s'enregistre elle-même dans PricingRuleRegistry (OnModuleInit).
 * • La clé `key` doit correspondre à un RULE_KEYS constant.
 * • Aucun code existant n'est modifié lors de l'ajout d'une nouvelle règle.
 */
export interface IPricingRuleHandler {
  /**
   * Clé unique de la règle (correspond à CityPricingConfig.ruleKey).
   * Doit correspondre à une valeur de RULE_KEYS.
   */
  readonly key: string;

  /**
   * Applique la règle au breakdown en cours de construction.
   * La règle lit les paramètres depuis `config.params` et modifie le builder.
   *
   * @param context  Contexte enrichi du trajet
   * @param builder  Builder mutable du prix (pattern Accumulator)
   * @param config   Enregistrement DB de cette règle pour cette ville/service
   */
  apply(
    context: RichPricingContext,
    builder: PriceBreakdownBuilder,
    config: CityPricingConfig,
  ): void;
}
