import { RideType } from '../../domain/entities/ride.entity';
export declare class CreateRideDto {
    type: RideType;
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropoffAddress: string;
    dropoffLat: number;
    dropoffLng: number;
    scheduledAt?: string;
    promoCode?: string;
}
