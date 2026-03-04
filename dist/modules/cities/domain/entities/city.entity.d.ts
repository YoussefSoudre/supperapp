export declare enum CityStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    COMING_SOON = "coming_soon"
}
export declare class City {
    id: string;
    name: string;
    slug: string;
    countryCode: string;
    currency: string;
    status: CityStatus;
    centerLat: number;
    centerLng: number;
    radiusKm: number;
    config: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
