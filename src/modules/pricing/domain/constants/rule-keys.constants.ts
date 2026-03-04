/**
 * RULE_KEYS — Clés canoniques des règles du moteur de pricing.
 *
 * Chaque clé correspond à un IPricingRuleHandler enregistré dans le PricingRuleRegistry.
 * Pour ajouter une règle (ex: météo) ➜ ajouter la clé ici + créer le handler.
 * AUCUNE modification de code existant n'est nécessaire.
 */
export const RULE_KEYS = {
  // ── Composantes de base ──────────────────────────────────────────────────
  BASE_FARE:           'base_fare',           // Tarif de prise en charge
  PER_KM:              'per_km',              // Coût kilométrique
  PER_MINUTE:          'per_minute',          // Coût temporel

  // ── Surge ────────────────────────────────────────────────────────────────
  SURGE:               'surge',               // Multiplicateur statique (configuré en DB)
  DYNAMIC_SURGE:       'dynamic_surge',       // Surge dynamique (heures de pointe + demand_factor)

  // ── Réductions ───────────────────────────────────────────────────────────
  CARPOOL_DISCOUNT:    'carpool_discount',     // Réduction covoiturage (par passager)

  // ── Frais & commissions ──────────────────────────────────────────────────
  PLATFORM_COMMISSION: 'platform_commission',  // Commission plateforme (%)
  CANCELLATION_FEE:    'cancellation_fee',     // Frais d'annulation fixes

  // ── Règles futures (non-breaker — il suffit de décommenter + créer le handler)
  // WEATHER_SURCHARGE:   'weather_surcharge',   // Majoration météo
  // EVENT_SURCHARGE:     'event_surcharge',     // Majoration événement
  // LOYALTY_DISCOUNT:    'loyalty_discount',    // Réduction fidélité
  // NIGHT_SURCHARGE:     'night_surcharge',     // Majoration nuit (alternative à dynamic_surge)
} as const;

export type RuleKey = (typeof RULE_KEYS)[keyof typeof RULE_KEYS];
