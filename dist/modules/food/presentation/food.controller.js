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
exports.FoodController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const food_service_1 = require("../application/food.service");
const public_decorator_1 = require("../../../shared/decorators/public.decorator");
let FoodController = class FoodController {
    foodService;
    constructor(foodService) {
        this.foodService = foodService;
    }
    getRestaurants(cityId) {
        return this.foodService.getRestaurants(cityId);
    }
    placeOrder(req, body) {
        return this.foodService.placeOrder(req.user.id, req.user.cityId, body);
    }
    getOrders(req, page = 1, limit = 20) {
        return this.foodService.getOrders(req.user.id, +page, +limit);
    }
};
exports.FoodController = FoodController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('restaurants'),
    __param(0, (0, common_1.Query)('cityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FoodController.prototype, "getRestaurants", null);
__decorate([
    (0, common_1.Post)('orders'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FoodController.prototype, "placeOrder", null);
__decorate([
    (0, common_1.Get)('orders'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], FoodController.prototype, "getOrders", null);
exports.FoodController = FoodController = __decorate([
    (0, swagger_1.ApiTags)('Food'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)({ path: 'food', version: '1' }),
    __metadata("design:paramtypes", [food_service_1.FoodService])
], FoodController);
//# sourceMappingURL=food.controller.js.map