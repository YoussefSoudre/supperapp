export declare enum RideStatus {
    PENDING = "pending",
    SEARCHING = "searching",
    ACCEPTED = "accepted",
    DRIVER_EN_ROUTE = "driver_en_route",
    ARRIVED = "arrived",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    SCHEDULED = "scheduled",
    NO_DRIVER = "no_driver"
}
export declare enum RideType {
    MOTO = "moto",
    CAR = "car",
    CARPOOL = "carpool"
}
export declare enum RideCancelledBy {
    USER = "user",
    DRIVER = "driver",
    SYSTEM = "system",
    ADMIN = "admin"
}
export declare class Ride {
    id: string;
    userId: string;
    driverId: string | null;
    cityId: string;
    type: RideType;
    status: RideStatus;
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropoffAddress: string;
    dropoffLat: number;
    dropoffLng: number;
    estimatedPrice: number;
    finalPrice: number | null;
    currency: string;
    surgeFactor: number;
    pricingRuleId: string | null;
    distanceKm: number | null;
    durationSeconds: number | null;
    acceptedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    scheduledAt: Date | null;
    cancelledBy: RideCancelledBy | null;
    cancellationReason: string | null;
    paymentId: string | null;
    isPaid: boolean;
    userRating: number | null;
    driverRating: number | null;
    userComment: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
