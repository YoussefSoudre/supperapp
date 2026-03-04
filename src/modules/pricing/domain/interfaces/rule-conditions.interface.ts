/**
 * RuleConditions — Conditions d'activation d'une règle de pricing.
 *
 * Toutes les propriétés sont optionnelles (null = pas de restriction).
 * Pour des conditions futures (météo, événement), il suffit d'ajouter
 * un champ ici + le vérifier dans PricingPipelineService.matchesConditions().
 */
export interface RuleConditions {
  /** Plage horaire : { start: "22:00", end: "06:00" } (supporte le créneau overnight) */
  time?: { start: string; end: string };

  /** Jours applicables ISO (1=Lundi … 7=Dimanche) */
  days?: number[];

  /** Nombre minimum de passagers (covoiturage) */
  minPassengers?: number;

  /** Si true, la règle s'applique uniquement en cas d'annulation */
  onlyOnCancellation?: boolean;

  /**
   * Champs extensibles pour de futures conditions sans modifier l'interface.
   * Exemples :
   *   custom: { weatherCondition: 'rain' }
   *   custom: { eventProximityKm: 2, minDemandFactor: 1.5 }
   */
  custom?: Record<string, unknown>;
}
