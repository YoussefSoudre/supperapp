/**
 * Constantes des queues BullMQ pour le module Rides.
 * Un seul fichier centralisé pour éviter les typos de noms de queues.
 */
export const QUEUES = {
  /** Déclenchement des courses planifiées (Cron → BullMQ delayed jobs) */
  SCHEDULED_RIDES: 'scheduled-rides',
  /** Recalcul prix + notifications après modification d'une course */
  RIDE_MODIFICATION: 'ride-modification',
} as const;

export const JOBS = {
  /** Déclencher une course planifiée arrivée à échéance */
  TRIGGER_SCHEDULED_RIDE: 'trigger-scheduled-ride',
  /** Recalculer le prix estimé après modification destination/heure */
  RECALCULATE_PRICE: 'recalculate-modification-price',
  /** Notifier le chauffeur assigné d'une modification en cours de route */
  NOTIFY_DRIVER_MODIFICATION: 'notify-driver-modification',
  /** Résoudre un conflit si le chauffeur refuse la modification */
  RESOLVE_DRIVER_CONFLICT: 'resolve-driver-conflict',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
export type JobName   = (typeof JOBS)[keyof typeof JOBS];

// ─── Job payloads ─────────────────────────────────────────────────────────────

export interface TriggerScheduledRideJob {
  rideId: string;
  userId: string;
  cityId: string;
  pickupLat: number;
  pickupLng: number;
  type: string;
}

export interface RecalculatePriceJob {
  rideId: string;
  cityId: string;
  newDropoffLat: number;
  newDropoffLng: number;
  pickupLat: number;
  pickupLng: number;
  type: string;
  oldEstimatedPrice: number;
  modificationFeeXof: number;
}

export interface NotifyDriverModificationJob {
  rideId: string;
  driverId: string;
  userId: string;
  changedField: string;
  oldValue: string;
  newValue: string;
  /** Délai avant re-dispatch si le chauffeur ne répond pas (ms) */
  driverResponseTimeoutMs: number;
}
