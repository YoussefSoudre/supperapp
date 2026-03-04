export declare class Restaurant {
    id: string;
    ownerId: string;
    cityId: string;
    name: string;
    slug: string;
    address: string;
    lat: number;
    lng: number;
    phone: string | null;
    rating: number;
    isActive: boolean;
    isOpen: boolean;
    openingHours: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
