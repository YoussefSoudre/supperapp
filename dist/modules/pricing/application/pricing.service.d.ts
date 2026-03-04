import { Repository } from 'typeorm';
import { PricingRule, PricingServiceType } from '../domain/entities/pricing-rule.entity';
export interface PricingContext {
    cityId: string;
    serviceType: PricingServiceType;
    distanceKm: number;
    durationMinutes: number;
    hour: number;
    dayOfWeek: number;
}
export interface PricingResult {
    price: number;
    currency: string;
    ruleId: string;
    surgeFactor: number;
    breakdown: {
        baseFare: number;
        distanceCost: number;
        timeCost: number;
        surgeAmount: number;
    };
}
export declare class PricingService {
    private readonly repo;
    constructor(repo: Repository<PricingRule>);
    calculate(ctx: PricingContext): Promise<PricingResult>;
    private findApplicableRule;
}
