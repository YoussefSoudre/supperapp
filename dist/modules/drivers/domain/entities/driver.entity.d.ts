export declare enum DriverStatus {
    PENDING_APPROVAL = "pending_approval",
    ACTIVE = "active",
    SUSPENDED = "suspended",
    OFFLINE = "offline",
    ONLINE = "online",
    ON_TRIP = "on_trip"
}
export declare enum VehicleType {
    MOTO = "moto",
    CAR = "car",
    PICKUP = "pickup",
    BIKE = "bike"
}
export declare class Driver {
    id: string;
    userId: string;
    cityId: string;
    status: DriverStatus;
    vehicleType: VehicleType;
    vehiclePlate: string;
    vehicleModel: string | null;
    lastLat: number | null;
    lastLng: number | null;
    lastSeenAt: Date | null;
    rating: number;
    totalTrips: number;
    documents: Record<string, string> | null;
    documentsVerified: boolean;
    acceptsCash: boolean;
    createdAt: Date;
    updatedAt: Date;
}
