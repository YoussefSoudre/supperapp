export declare const DomainEvents: {
    readonly USER_REGISTERED: "user.registered";
    readonly USER_PASSWORD_RESET: "user.password_reset";
    readonly RIDE_REQUESTED: "ride.requested";
    readonly RIDE_ACCEPTED: "ride.accepted";
    readonly RIDE_STARTED: "ride.started";
    readonly RIDE_COMPLETED: "ride.completed";
    readonly RIDE_CANCELLED: "ride.cancelled";
    readonly RIDE_SCHEDULED: "ride.scheduled";
    readonly RIDE_MODIFIED: "ride.modified";
    readonly DELIVERY_CREATED: "delivery.created";
    readonly DELIVERY_PICKED_UP: "delivery.picked_up";
    readonly DELIVERY_COMPLETED: "delivery.completed";
    readonly DELIVERY_CANCELLED: "delivery.cancelled";
    readonly FOOD_ORDER_PLACED: "food.order.placed";
    readonly FOOD_ORDER_CONFIRMED: "food.order.confirmed";
    readonly FOOD_ORDER_READY: "food.order.ready";
    readonly FOOD_ORDER_DELIVERED: "food.order.delivered";
    readonly FOOD_ORDER_CANCELLED: "food.order.cancelled";
    readonly PAYMENT_INITIATED: "payment.initiated";
    readonly PAYMENT_SUCCESS: "payment.success";
    readonly PAYMENT_FAILED: "payment.failed";
    readonly PAYMENT_REFUNDED: "payment.refunded";
    readonly WALLET_CREDITED: "wallet.credited";
    readonly WALLET_DEBITED: "wallet.debited";
    readonly WALLET_WITHDRAWAL_REQUESTED: "wallet.withdrawal.requested";
    readonly REFERRAL_APPLIED: "referral.applied";
    readonly REFERRAL_REWARD_GRANTED: "referral.reward.granted";
    readonly NOTIFICATION_PUSH_REQUESTED: "notification.push.requested";
    readonly NOTIFICATION_SMS_REQUESTED: "notification.sms.requested";
    readonly NOTIFICATION_EMAIL_REQUESTED: "notification.email.requested";
    readonly DRIVER_WENT_ONLINE: "driver.online";
    readonly DRIVER_WENT_OFFLINE: "driver.offline";
    readonly DRIVER_LOCATION_UPDATED: "driver.location.updated";
    readonly DISPATCH_DRIVER_ASSIGNED: "dispatch.driver.assigned";
    readonly DISPATCH_NO_DRIVER_FOUND: "dispatch.no_driver.found";
};
export type DomainEventName = (typeof DomainEvents)[keyof typeof DomainEvents];
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
export interface NotificationRequestedPayload {
    version: 1;
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    channels: ('push' | 'sms' | 'email')[];
    timestamp: Date;
}
