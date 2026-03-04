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
exports.Delivery = exports.PackageSize = exports.DeliveryStatus = void 0;
const typeorm_1 = require("typeorm");
var DeliveryStatus;
(function (DeliveryStatus) {
    DeliveryStatus["PENDING"] = "pending";
    DeliveryStatus["SEARCHING"] = "searching";
    DeliveryStatus["ACCEPTED"] = "accepted";
    DeliveryStatus["PICKED_UP"] = "picked_up";
    DeliveryStatus["IN_TRANSIT"] = "in_transit";
    DeliveryStatus["DELIVERED"] = "delivered";
    DeliveryStatus["FAILED"] = "failed";
    DeliveryStatus["CANCELLED"] = "cancelled";
})(DeliveryStatus || (exports.DeliveryStatus = DeliveryStatus = {}));
var PackageSize;
(function (PackageSize) {
    PackageSize["SMALL"] = "small";
    PackageSize["MEDIUM"] = "medium";
    PackageSize["LARGE"] = "large";
})(PackageSize || (exports.PackageSize = PackageSize = {}));
let Delivery = class Delivery {
    id;
    senderId;
    driverId;
    cityId;
    status;
    packageSize;
    packageDescription;
    pickupAddress;
    pickupLat;
    pickupLng;
    dropoffAddress;
    dropoffLat;
    dropoffLng;
    recipientName;
    recipientPhone;
    estimatedPrice;
    finalPrice;
    currency;
    confirmationCode;
    paymentId;
    isPaid;
    pickedUpAt;
    deliveredAt;
    metadata;
    createdAt;
    updatedAt;
};
exports.Delivery = Delivery;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Delivery.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'sender_id' }),
    __metadata("design:type", String)
], Delivery.prototype, "senderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'driver_id' }),
    __metadata("design:type", Object)
], Delivery.prototype, "driverId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'city_id' }),
    __metadata("design:type", String)
], Delivery.prototype, "cityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING }),
    __metadata("design:type", String)
], Delivery.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PackageSize, name: 'package_size' }),
    __metadata("design:type", String)
], Delivery.prototype, "packageSize", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, name: 'package_description' }),
    __metadata("design:type", String)
], Delivery.prototype, "packageDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, name: 'pickup_address' }),
    __metadata("design:type", String)
], Delivery.prototype, "pickupAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, name: 'pickup_lat' }),
    __metadata("design:type", Number)
], Delivery.prototype, "pickupLat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, name: 'pickup_lng' }),
    __metadata("design:type", Number)
], Delivery.prototype, "pickupLng", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, name: 'dropoff_address' }),
    __metadata("design:type", String)
], Delivery.prototype, "dropoffAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, name: 'dropoff_lat' }),
    __metadata("design:type", Number)
], Delivery.prototype, "dropoffLat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, name: 'dropoff_lng' }),
    __metadata("design:type", Number)
], Delivery.prototype, "dropoffLng", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, name: 'recipient_name' }),
    __metadata("design:type", String)
], Delivery.prototype, "recipientName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, name: 'recipient_phone' }),
    __metadata("design:type", String)
], Delivery.prototype, "recipientPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'estimated_price' }),
    __metadata("design:type", Number)
], Delivery.prototype, "estimatedPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'final_price' }),
    __metadata("design:type", Object)
], Delivery.prototype, "finalPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, default: 'XOF' }),
    __metadata("design:type", String)
], Delivery.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 6, nullable: true, name: 'confirmation_code' }),
    __metadata("design:type", Object)
], Delivery.prototype, "confirmationCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'payment_id' }),
    __metadata("design:type", Object)
], Delivery.prototype, "paymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false, name: 'is_paid' }),
    __metadata("design:type", Boolean)
], Delivery.prototype, "isPaid", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'picked_up_at' }),
    __metadata("design:type", Object)
], Delivery.prototype, "pickedUpAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'delivered_at' }),
    __metadata("design:type", Object)
], Delivery.prototype, "deliveredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Delivery.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Delivery.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Delivery.prototype, "updatedAt", void 0);
exports.Delivery = Delivery = __decorate([
    (0, typeorm_1.Entity)('deliveries'),
    (0, typeorm_1.Index)('idx_del_sender', ['senderId', 'status', 'createdAt']),
    (0, typeorm_1.Index)('idx_del_driver', ['driverId', 'status']),
    (0, typeorm_1.Index)('idx_del_city', ['cityId', 'status'])
], Delivery);
//# sourceMappingURL=delivery.entity.js.map