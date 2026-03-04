import { RideStatus, RideType } from '../../domain/entities/ride.entity';
export declare class RideResponseDto {
    id: string;
    userId: string;
    driverId: string | null;
    type: RideType;
    status: RideStatus;
    pickupAddress: string;
    dropoffAddress: string;
    estimatedPrice: number;
    finalPrice: number | null;
    currency: string;
    surgeFactor: number;
    distanceKm: number | null;
    scheduledAt: Date | null;
    createdAt: Date;
}
