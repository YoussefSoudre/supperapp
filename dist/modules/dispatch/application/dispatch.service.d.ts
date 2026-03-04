import { EventBusService } from '../../../shared/events/event-bus.service';
interface RideRequestedPayload {
    rideId: string;
    userId: string;
    cityId: string;
    pickupLat: number;
    pickupLng: number;
    type: string;
    timestamp: Date;
}
export declare class DispatchService {
    private readonly eventBus;
    private readonly logger;
    private readonly SEARCH_RADIUS_KM;
    private readonly MAX_RETRIES;
    private readonly TIMEOUT_MS;
    constructor(eventBus: EventBusService);
    onRideRequested(payload: RideRequestedPayload): Promise<void>;
    private score;
    private haversineKm;
}
export {};
