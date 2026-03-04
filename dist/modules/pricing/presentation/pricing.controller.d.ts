import { PricingService } from '../application/pricing.service';
import { PricingServiceType } from '../domain/entities/pricing-rule.entity';
export declare class PricingController {
    private readonly pricingService;
    constructor(pricingService: PricingService);
    estimate(req: {
        user: {
            cityId: string;
        };
    }, body: {
        serviceType: PricingServiceType;
        distanceKm: number;
        durationMinutes: number;
    }): Promise<import("../application/pricing.service").PricingResult>;
}
