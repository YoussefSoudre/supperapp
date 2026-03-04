import { FoodService } from '../application/food.service';
export declare class FoodController {
    private readonly foodService;
    constructor(foodService: FoodService);
    getRestaurants(cityId: string): Promise<import("../domain/entities/restaurant.entity").Restaurant[]>;
    placeOrder(req: {
        user: {
            id: string;
            cityId: string;
        };
    }, body: any): Promise<import("../domain/entities/food-order.entity").FoodOrder>;
    getOrders(req: {
        user: {
            id: string;
        };
    }, page?: number, limit?: number): Promise<{
        data: import("../domain/entities/food-order.entity").FoodOrder[];
        total: number;
        page: number;
        limit: number;
    }>;
}
