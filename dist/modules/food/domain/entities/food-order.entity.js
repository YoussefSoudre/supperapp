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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoodOrder = exports.FoodOrderStatus = void 0;
const typeorm_1 = require("typeorm");
var FoodOrderStatus;
(function (FoodOrderStatus) {
    FoodOrderStatus["PENDING"] = "pending";
    FoodOrderStatus["CONFIRMED"] = "confirmed";
    FoodOrderStatus["PREPARING"] = "preparing";
    FoodOrderStatus["READY_FOR_PICKUP"] = "ready_for_pickup";
    FoodOrderStatus["PICKED_UP"] = "picked_up";
    FoodOrderStatus["DELIVERED"] = "delivered";
    FoodOrderStatus["CANCELLED"] = "cancelled";
})(FoodOrderStatus || (exports.FoodOrderStatus = FoodOrderStatus = {}));
let FoodOrder = class FoodOrder {
    id;
    userId;
    restaurantId;
    driverId;
    status;
    items;
    subtotal;
    deliveryFee;
    discount;
    total;
    currency;
    deliveryAddress;
    deliveryLat;
    deliveryLng;
    specialInstructions;
    paymentId;
    isPaid;
    estimatedDeliveryAt;
    deliveredAt;
    createdAt;
    updatedAt;
};
exports.FoodOrder = FoodOrder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FoodOrder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id' }),
    __metadata("design:type", String)
], FoodOrder.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'restaurant_id' }),
    __metadata("design:type", String)
], FoodOrder.prototype, "restaurantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'driver_id' }),
    __metadata("design:type", Object)
], FoodOrder.prototype, "driverId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: FoodOrderStatus, default: FoodOrderStatus.PENDING }),
    __metadata("design:type", String)
], FoodOrder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Array)
], FoodOrder.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'subtotal' }),
    __metadata("design:type", Number)
], FoodOrder.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'delivery_fee' }),
    __metadata("design:type", Number)
], FoodOrder.prototype, "deliveryFee", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], FoodOrder.prototype, "discount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], FoodOrder.prototype, "total", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, default: 'XOF' }),
    __metadata("design:type", String)
], FoodOrder.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, name: 'delivery_address' }),
    __metadata("design:type", String)
], FoodOrder.prototype, "deliveryAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, name: 'delivery_lat' }),
    __metadata("design:type", Number)
], FoodOrder.prototype, "deliveryLat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, name: 'delivery_lng' }),
    __metadata("design:type", Number)
], FoodOrder.prototype, "deliveryLng", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'special_instructions' }),
    __metadata("design:type", Object)
], FoodOrder.prototype, "specialInstructions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'payment_id' }),
    __metadata("design:type", Object)
], FoodOrder.prototype, "paymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false, name: 'is_paid' }),
    __metadata("design:type", Boolean)
], FoodOrder.prototype, "isPaid", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'estimated_delivery_at' }),
    __metadata("design:type", Object)
], FoodOrder.prototype, "estimatedDeliveryAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'delivered_at' }),
    __metadata("design:type", Object)
], FoodOrder.prototype, "deliveredAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], FoodOrder.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], FoodOrder.prototype, "updatedAt", void 0);
exports.FoodOrder = FoodOrder = __decorate([
    (0, typeorm_1.Entity)('food_orders'),
    (0, typeorm_1.Index)('idx_fo_user', ['userId', 'status', 'createdAt']),
    (0, typeorm_1.Index)('idx_fo_restaurant', ['restaurantId', 'status']),
    (0, typeorm_1.Index)('idx_fo_driver', ['driverId', 'status'])
], FoodOrder);
//# sourceMappingURL=food-order.entity.js.map