export enum RideStatusTransitions {
  PENDING_TO_SEARCHING = 'pending → searching',
  SEARCHING_TO_ACCEPTED = 'searching → accepted',
  ACCEPTED_TO_DRIVER_EN_ROUTE = 'accepted → driver_en_route',
  DRIVER_EN_ROUTE_TO_ARRIVED = 'driver_en_route → arrived',
  ARRIVED_TO_IN_PROGRESS = 'arrived → in_progress',
  IN_PROGRESS_TO_COMPLETED = 'in_progress → completed',
}

/**
 * Value Object — Règles de transition de statut.
 * Centralise la logique métier ici, jamais dans les contrôleurs.
 */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:          ['searching', 'cancelled'],
  searching:        ['accepted', 'cancelled', 'no_driver'],
  accepted:         ['driver_en_route', 'cancelled'],
  driver_en_route:  ['arrived', 'cancelled'],
  arrived:          ['in_progress', 'cancelled'],
  in_progress:      ['completed'],
  scheduled:        ['searching', 'cancelled'],
};

export function canTransitionTo(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
