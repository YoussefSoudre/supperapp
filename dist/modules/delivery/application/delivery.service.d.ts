import { Repository } from 'typeorm';
import { Delivery } from '../domain/entities/delivery.entity';
import { EventBusService } from '../../../shared/events/event-bus.service';
export declare class DeliveryService {
    private readonly repo;
    private readonly eventBus;
    constructor(repo: Repository<Delivery>, eventBus: EventBusService);
    create(data: Partial<Delivery>): Promise<Delivery>;
    findBySenderId(senderId: string, page?: number, limit?: number): Promise<{
        data: Delivery[];
        total: number;
        page: number;
        limit: number;
    }>;
}
