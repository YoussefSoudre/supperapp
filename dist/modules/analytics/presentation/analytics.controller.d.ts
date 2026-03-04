import { AnalyticsService } from '../application/analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getMetrics(): {
        totalRides: number;
        totalRevenueXOF: number;
        ridesByCity: Record<string, number>;
    };
}
