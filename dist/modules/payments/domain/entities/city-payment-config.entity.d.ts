export declare class CityPaymentConfig {
    id: string;
    cityId: string;
    provider: string;
    isEnabled: boolean;
    config: Record<string, unknown>;
    feePercent: number;
    feeFixed: number;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
}
