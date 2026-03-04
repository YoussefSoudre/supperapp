export declare enum NotificationChannel {
    PUSH = "push",
    SMS = "sms",
    EMAIL = "email",
    IN_APP = "in_app"
}
export declare enum NotificationStatus {
    PENDING = "pending",
    SENT = "sent",
    FAILED = "failed",
    READ = "read"
}
export declare enum NotificationCategory {
    RIDE = "ride",
    PAYMENT = "payment",
    PROMO = "promo",
    SYSTEM = "system",
    REFERRAL = "referral",
    DELIVERY = "delivery",
    FOOD = "food"
}
export declare class Notification {
    id: string;
    userId: string;
    channel: NotificationChannel;
    category: NotificationCategory;
    status: NotificationStatus;
    title: string;
    body: string;
    data: Record<string, unknown> | null;
    providerMessageId: string | null;
    sentAt: Date | null;
    readAt: Date | null;
    failureReason: string | null;
    createdAt: Date;
}
