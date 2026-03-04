"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoodService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const food_order_entity_1 = require("../domain/entities/food-order.entity");
const restaurant_entity_1 = require("../domain/entities/restaurant.entity");
const event_bus_service_1 = require("../../../shared/events/event-bus.service");
const domain_events_constants_1 = require("../../../shared/events/domain-events.constants");
let FoodService = class FoodService {
    orderRepo;
    restaurantRepo;
    eventBus;
    constructor(orderRepo, restaurantRepo, eventBus) {
        this.orderRepo = orderRepo;
        this.restaurantRepo = restaurantRepo;
        this.eventBus = eventBus;
    }
    async getRestaurants(cityId) {
        return this.restaurantRepo.find({
            where: { cityId, isActive: true },
            order: { rating: 'DESC' },
        });
    }
    async placeOrder(userId, cityId, data) {
        const order = await this.orderRepo.save(this.orderRepo.create({ ...data, userId, status: food_order_entity_1.FoodOrderStatus.PENDING }));
        await this.eventBus.emit(domain_events_constants_1.DomainEvents.FOOD_ORDER_PLACED, {
            version: 1,
            orderId: order.id,
            userId,
            restaurantId: order.restaurantId,
            total: order.total,
            cityId,
            timestamp: new Date(),
        });
        return order;
    }
    async getOrders(userId, page = 1, limit = 20) {
        const [data, total] = await this.orderRepo.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit };
    }
};
exports.FoodService = FoodService;
exports.FoodService = FoodService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(food_order_entity_1.FoodOrder)),
    __param(1, (0, typeorm_1.InjectRepository)(restaurant_entity_1.Restaurant)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        event_bus_service_1.EventBusService])
], FoodService);
//# sourceMappingURL=food.service.js.map