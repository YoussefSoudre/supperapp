export declare class CancelRideDto {
    reason?: string;
}
export declare class RateRideDto {
    rating: number;
    comment?: string;
}
export declare class ModifyRideDto {
    dropoffAddress?: string;
    dropoffLat?: number;
    dropoffLng?: number;
    scheduledAt?: string;
    reason?: string;
}
