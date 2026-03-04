import { Repository } from 'typeorm';
import { FoodOrder } from '../domain/entities/food-order.entity';
import { Restaurant } from '../domain/entities/restaurant.entity';
import { EventBusService } from '../../../shared/events/event-bus.service';
export declare class FoodService {
    private readonly orderRepo;
    private readonly restaurantRepo;
    private readonly eventBus;
    constructor(orderRepo: Repository<FoodOrder>, restaurantRepo: Repository<Restaurant>, eventBus: EventBusService);
    getRestaurants(cityId: string): Promise<Restaurant[]>;
    placeOrder(userId: string, cityId: string, data: Partial<FoodOrder>): Promise<FoodOrder>;
    getOrders(userId: string, page?: number, limit?: number): Promise<{
        data: FoodOrder[];
        total: number;
        page: number;
        limit: number;
    }>;
}
