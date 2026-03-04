import { DeliveryService } from '../application/delivery.service';
export declare class DeliveryController {
    private readonly deliveryService;
    constructor(deliveryService: DeliveryService);
    create(req: {
        user: {
            id: string;
            cityId: string;
        };
    }, body: any): Promise<import("../domain/entities/delivery.entity").Delivery>;
    findMine(req: {
        user: {
            id: string;
        };
    }, page?: number, limit?: number): Promise<{
        data: import("../domain/entities/delivery.entity").Delivery[];
        total: number;
        page: number;
        limit: number;
    }>;
}
