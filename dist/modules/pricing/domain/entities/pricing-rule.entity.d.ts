export declare enum PricingServiceType {
    MOTO = "moto",
    CAR = "car",
    CARPOOL = "carpool",
    DELIVERY = "delivery",
    FOOD = "food"
}
export declare class PricingRule {
    id: string;
    cityId: string;
    serviceType: PricingServiceType;
    name: string;
    baseFare: number;
    perKmRate: number;
    perMinuteRate: number;
    minimumFare: number;
    maximumFare: number | null;
    surgeMultiplier: number;
    currency: string;
    timeConditions: Record<string, unknown> | null;
    dayConditions: number[] | null;
    priority: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
