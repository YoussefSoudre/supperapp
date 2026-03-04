export declare enum DeliveryStatus {
    PENDING = "pending",
    SEARCHING = "searching",
    ACCEPTED = "accepted",
    PICKED_UP = "picked_up",
    IN_TRANSIT = "in_transit",
    DELIVERED = "delivered",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare enum PackageSize {
    SMALL = "small",
    MEDIUM = "medium",
    LARGE = "large"
}
export declare class Delivery {
    id: string;
    senderId: string;
    driverId: string | null;
    cityId: string;
    status: DeliveryStatus;
    packageSize: PackageSize;
    packageDescription: string;
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropoffAddress: string;
    dropoffLat: number;
    dropoffLng: number;
    recipientName: string;
    recipientPhone: string;
    estimatedPrice: number;
    finalPrice: number | null;
    currency: string;
    confirmationCode: string | null;
    paymentId: string | null;
    isPaid: boolean;
    pickedUpAt: Date | null;
    deliveredAt: Date | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
