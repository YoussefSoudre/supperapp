import { RideCompletedPayload } from '../../../shared/events/domain-events.constants';
export declare class AnalyticsService {
    private readonly logger;
    private metrics;
    onRideCompleted(payload: RideCompletedPayload): void;
    getMetrics(): {
        totalRides: number;
        totalRevenueXOF: number;
        ridesByCity: Record<string, number>;
    };
}
