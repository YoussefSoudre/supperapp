export declare enum ModificationField {
    DROPOFF_ADDRESS = "dropoff_address",
    SCHEDULED_AT = "scheduled_at",
    RIDE_TYPE = "ride_type",
    PICKUP_ADDRESS = "pickup_address"
}
export declare class RideModificationLog {
    id: string;
    rideId: string;
    modifiedById: string;
    field: ModificationField;
    oldValue: string;
    newValue: string;
    reason: string | null;
    createdAt: Date;
}
