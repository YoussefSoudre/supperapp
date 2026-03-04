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
exports.Ride = exports.RideCancelledBy = exports.RideType = exports.RideStatus = void 0;
const typeorm_1 = require("typeorm");
var RideStatus;
(function (RideStatus) {
    RideStatus["PENDING"] = "pending";
    RideStatus["SEARCHING"] = "searching";
    RideStatus["ACCEPTED"] = "accepted";
    RideStatus["DRIVER_EN_ROUTE"] = "driver_en_route";
    RideStatus["ARRIVED"] = "arrived";
    RideStatus["IN_PROGRESS"] = "in_progress";
    RideStatus["COMPLETED"] = "completed";
    RideStatus["CANCELLED"] = "cancelled";
    RideStatus["SCHEDULED"] = "scheduled";
    RideStatus["NO_DRIVER"] = "no_driver";
})(RideStatus || (exports.RideStatus = RideStatus = {}));
var RideType;
(function (RideType) {
    RideType["MOTO"] = "moto";
    RideType["CAR"] = "car";
    RideType["CARPOOL"] = "carpool";
})(RideType || (exports.RideType = RideType = {}));
var RideCancelledBy;
(function (RideCancelledBy) {
    RideCancelledBy["USER"] = "user";
    RideCancelledBy["DRIVER"] = "driver";
    RideCancelledBy["SYSTEM"] = "system";
    RideCancelledBy["ADMIN"] = "admin";
})(RideCancelledBy || (exports.RideCancelledBy = RideCancelledBy = {}));
let Ride = class Ride {
    id;
    userId;
    driverId;
    cityId;
    type;
    status;
    pickupAddress;
    pickupLat;
    pickupLng;
    dropoffAddress;
    dropoffLat;
    dropoffLng;
    estimatedPrice;
    finalPrice;
    currency;
    surgeFactor;
    pricingRuleId;
    distanceKm;
    durationSeconds;
    acceptedAt;
    startedAt;
    completedAt;
    cancelledAt;
    scheduledAt;
    cancelledBy;
    cancellationReason;
    paymentId;
    isPaid;
    userRating;
    driverRating;
    userComment;
    metadata;
    createdAt;
    updatedAt;
};
exports.Ride = Ride;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Ride.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id' }),
    __metadata("design:type", String)
], Ride.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'driver_id' }),
    __metadata("design:type", Object)
], Ride.prototype, "driverId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'city_id' }),
    __metadata("design:type", String)
], Ride.prototype, "cityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: RideType }),
    __metadata("design:type", String)
], Ride.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: RideStatus, default: RideStatus.PENDING }),
    __metadata("design:type", String)
], Ride.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, name: 'pickup_address' }),
    __metadata("design:type", String)
], Ride.prototype, "pickupAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, name: 'pickup_lat' }),
    __metadata("design:type", Number)
], Ride.prototype, "pickupLat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, name: 'pickup_lng' }),
    __metadata("design:type", Number)
], Ride.prototype, "pickupLng", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, name: 'dropoff_address' }),
    __metadata("design:type", String)
], Ride.prototype, "dropoffAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, name: 'dropoff_lat' }),
    __metadata("design:type", Number)
], Ride.prototype, "dropoffLat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, name: 'dropoff_lng' }),
    __metadata("design:type", Number)
], Ride.prototype, "dropoffLng", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, name: 'estimated_price' }),
    __metadata("design:type", Number)
], Ride.prototype, "estimatedPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'final_price' }),
    __metadata("design:type", Object)
], Ride.prototype, "finalPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, default: 'XOF' }),
    __metadata("design:type", String)
], Ride.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 4, scale: 2, default: 1.0, name: 'surge_factor' }),
    __metadata("design:type", Number)
], Ride.prototype, "surgeFactor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'pricing_rule_id' }),
    __metadata("design:type", Object)
], Ride.prototype, "pricingRuleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 3, nullable: true, name: 'distance_km' }),
    __metadata("design:type", Object)
], Ride.prototype, "distanceKm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true, name: 'duration_seconds' }),
    __metadata("design:type", Object)
], Ride.prototype, "durationSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'accepted_at' }),
    __metadata("design:type", Object)
], Ride.prototype, "acceptedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'started_at' }),
    __metadata("design:type", Object)
], Ride.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'completed_at' }),
    __metadata("design:type", Object)
], Ride.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'cancelled_at' }),
    __metadata("design:type", Object)
], Ride.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'scheduled_at' }),
    __metadata("design:type", Object)
], Ride.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: RideCancelledBy, nullable: true, name: 'cancelled_by' }),
    __metadata("design:type", Object)
], Ride.prototype, "cancelledBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 500, nullable: true, name: 'cancellation_reason' }),
    __metadata("design:type", Object)
], Ride.prototype, "cancellationReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'payment_id' }),
    __metadata("design:type", Object)
], Ride.prototype, "paymentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false, name: 'is_paid' }),
    __metadata("design:type", Boolean)
], Ride.prototype, "isPaid", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true, name: 'user_rating' }),
    __metadata("design:type", Object)
], Ride.prototype, "userRating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true, name: 'driver_rating' }),
    __metadata("design:type", Object)
], Ride.prototype, "driverRating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'user_comment' }),
    __metadata("design:type", Object)
], Ride.prototype, "userComment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Ride.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Ride.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Ride.prototype, "updatedAt", void 0);
exports.Ride = Ride = __decorate([
    (0, typeorm_1.Entity)('rides'),
    (0, typeorm_1.Index)('idx_rides_user_status', ['userId', 'status', 'createdAt']),
    (0, typeorm_1.Index)('idx_rides_driver_status', ['driverId', 'status']),
    (0, typeorm_1.Index)('idx_rides_city', ['cityId', 'status', 'createdAt']),
    (0, typeorm_1.Index)('idx_rides_scheduled', ['scheduledAt'], { where: '"status" = \'scheduled\'' }),
    (0, typeorm_1.Index)('idx_rides_status', ['status'])
], Ride);
//# sourceMappingURL=ride.entity.js.map