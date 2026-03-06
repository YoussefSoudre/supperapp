/**
 * Catalogue global immuable de tous les Domain Events.
 * Ajouter ici — ne jamais modifier les existants pour garantir
 * la compatibilité des consommateurs.
 */
export const DomainEvents = {
  // ─── Auth ───────────────────────────────────────────────
  USER_REGISTERED: 'user.registered',
  USER_PHONE_VERIFIED: 'user.phone_verified',
  USER_PASSWORD_RESET: 'user.password_reset',

  // ─── Rides ──────────────────────────────────────────────
  RIDE_REQUESTED:            'ride.requested',
  RIDE_ACCEPTED:             'ride.accepted',
  RIDE_STARTED:              'ride.started',
  RIDE_COMPLETED:            'ride.completed',
  RIDE_CANCELLED:            'ride.cancelled',
  RIDE_SCHEDULED:            'ride.scheduled',
  RIDE_MODIFIED:             'ride.modified',
  RIDE_MODIFICATION_REFUSED: 'ride.modification.refused', // chauffeur refuse la modif
  SCHEDULED_RIDE_TRIGGERED:  'ride.scheduled.triggered',  // job BullMQ déclenché

  // ─── Delivery ────────────────────────────────────────────
  DELIVERY_CREATED: 'delivery.created',
  DELIVERY_PICKED_UP: 'delivery.picked_up',
  DELIVERY_COMPLETED: 'delivery.completed',
  DELIVERY_CANCELLED: 'delivery.cancelled',

  // ─── Food ────────────────────────────────────────────────
  FOOD_ORDER_PLACED: 'food.order.placed',
  FOOD_ORDER_CONFIRMED: 'food.order.confirmed',
  FOOD_ORDER_READY: 'food.order.ready',
  FOOD_ORDER_DELIVERED: 'food.order.delivered',
  FOOD_ORDER_CANCELLED: 'food.order.cancelled',

  // ─── Payment ─────────────────────────────────────────────
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // ─── Wallet ──────────────────────────────────────────────
  WALLET_CREDITED: 'wallet.credited',
  WALLET_DEBITED: 'wallet.debited',
  WALLET_WITHDRAWAL_REQUESTED: 'wallet.withdrawal.requested',

  // ─── Referral ────────────────────────────────────────────
  REFERRAL_APPLIED:        'referral.applied',
  REFERRAL_REWARD_GRANTED: 'referral.reward.granted',
  REFERRAL_ABUSE_DETECTED: 'referral.abuse.detected',

  // ─── Notifications ───────────────────────────────────────
  NOTIFICATION_PUSH_REQUESTED: 'notification.push.requested',
  NOTIFICATION_SMS_REQUESTED: 'notification.sms.requested',
  NOTIFICATION_EMAIL_REQUESTED: 'notification.email.requested',

  // ─── Driver ──────────────────────────────────────────────
  DRIVER_WENT_ONLINE: 'driver.online',
  DRIVER_WENT_OFFLINE: 'driver.offline',
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',

  // ─── Dispatch ────────────────────────────────────────────
  DISPATCH_DRIVER_ASSIGNED: 'dispatch.driver.assigned',
  DISPATCH_NO_DRIVER_FOUND: 'dispatch.no_driver.found',

  // ─── Rating ──────────────────────────────────────────────────────────────
  RIDE_RATED: 'ride.rated',

  // ─── User KYC ────────────────────────────────────────────────────────────
  USER_KYC_SUBMITTED: 'user.kyc.submitted',
  USER_KYC_APPROVED:  'user.kyc.approved',
  USER_KYC_REJECTED:  'user.kyc.rejected',
} as const;

export type DomainEventName = (typeof DomainEvents)[keyof typeof DomainEvents];

// ─── Payload types per event ──────────────────────────────────────────────────

export interface RideCompletedPayload {
  version: 1;
  rideId: string;
  driverId: string;
  userId: string;
  amount: number;
  currency: string;
  cityId: string;
  serviceType: 'moto' | 'car' | 'carpool';
  surgeApplied?: boolean;
  timestamp: Date;
}

export interface PaymentSuccessPayload {
  version: 1;
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  serviceType: string;
  referenceId: string;
  provider: string;
  timestamp: Date;
}

export interface UserRegisteredPayload {
  version: 1;
  userId: string;
  phone: string;
  referralCode?: string;
  cityId: string;
  timestamp: Date;
}

export interface UserPhoneVerifiedPayload {
  version: 1;
  userId: string;
  phone: string;
  firstName: string;
  cityId: string;
  timestamp: Date;
}

export interface RideModifiedPayload {
  version: 1;
  rideId: string;
  userId: string;
  driverId: string | null;
  cityId: string;
  /** Champ modifié: dropoff_address | scheduled_at | pickup_address */
  field: string;
  oldValue: string;
  newValue: string;
  /** Phase de la course au moment de la modification */
  rideStatus: string;
  /** Frais de modification appliqués (centimes XOF) */
  modificationFeeXof: number;
  /** Prix estimé recalculé après modification */
  newEstimatedPrice: number;
  timestamp: Date;
}

export interface RideScheduledTriggeredPayload {
  version: 1;
  rideId: string;
  userId: string;
  cityId: string;
  pickupLat: number;
  pickupLng: number;
  type: string;
  scheduledAt: Date;
  timestamp: Date;
}

export interface DeliveryCompletedPayload {
  version: 1;
  deliveryId: string;
  driverId: string;
  userId: string;       // expéditeur
  amount: number;       // centimes XOF
  currency: string;
  cityId: string;
  timestamp: Date;
}

export interface FoodOrderDeliveredPayload {
  version: 1;
  orderId: string;
  driverId: string;
  userId: string;       // client
  amount: number;       // centimes XOF
  currency: string;
  cityId: string;
  timestamp: Date;
}

export interface ReferralRewardGrantedPayload {
  version: 1;
  referralUsageId: string;
  programId: string;
  cityId: string;
  referrerId: string;
  refereeId: string;
  triggerOrderId: string;
  serviceType: string;
  referrerAmountXof: number;
  refereeAmountXof: number;
  timestamp: Date;
}

export interface RideCancelledPayload {
  version: 1;
  rideId: string;
  userId: string;
  driverId: string | null;
  cityId: string;
  cancelledBy: string;          // 'user' | 'driver' | 'admin' | 'system'
  reason: string | null;
  rideStatus: string;           // statut avant annulation
  timestamp: Date;
}

export interface RideRatedPayload {
  version: 1;
  rideId: string;
  ratedBy: 'passenger' | 'driver';
  raterId: string;
  ratedId: string | null;
  rating: number;               // 1 – 5
  comment: string | null;
  timestamp: Date;
}

export interface ReferralAbuseDetectedPayload {
  version: 1;
  suspectedUserId: string;
  referralCode: string;
  reason: string;
  cityId: string;
  timestamp: Date;
}

export interface NotificationRequestedPayload {
  version: 1;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: ('push' | 'sms' | 'email')[];
  timestamp: Date;
}

export interface UserKycSubmittedPayload {
  version: 1;
  userId: string;
  kycId: string;
  timestamp: Date;
}

export interface UserKycReviewedPayload {
  version: 1;
  userId: string;
  kycId: string;
  decision: 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy: string;
  timestamp: Date;
}
