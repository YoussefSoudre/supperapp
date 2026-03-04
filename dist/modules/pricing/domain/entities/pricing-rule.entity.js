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
exports.PricingRule = exports.PricingServiceType = void 0;
const typeorm_1 = require("typeorm");
var PricingServiceType;
(function (PricingServiceType) {
    PricingServiceType["MOTO"] = "moto";
    PricingServiceType["CAR"] = "car";
    PricingServiceType["CARPOOL"] = "carpool";
    PricingServiceType["DELIVERY"] = "delivery";
    PricingServiceType["FOOD"] = "food";
})(PricingServiceType || (exports.PricingServiceType = PricingServiceType = {}));
let PricingRule = class PricingRule {
    id;
    cityId;
    serviceType;
    name;
    baseFare;
    perKmRate;
    perMinuteRate;
    minimumFare;
    maximumFare;
    surgeMultiplier;
    currency;
    timeConditions;
    dayConditions;
    priority;
    isActive;
    createdAt;
    updatedAt;
};
exports.PricingRule = PricingRule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PricingRule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'city_id' }),
    __metadata("design:type", String)
], PricingRule.prototype, "cityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PricingServiceType, name: 'service_type' }),
    __metadata("design:type", String)
], PricingRule.prototype, "serviceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], PricingRule.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'base_fare' }),
    __metadata("design:type", Number)
], PricingRule.prototype, "baseFare", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 2, name: 'per_km_rate' }),
    __metadata("design:type", Number)
], PricingRule.prototype, "perKmRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 2, name: 'per_minute_rate' }),
    __metadata("design:type", Number)
], PricingRule.prototype, "perMinuteRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'minimum_fare' }),
    __metadata("design:type", Number)
], PricingRule.prototype, "minimumFare", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'maximum_fare' }),
    __metadata("design:type", Object)
], PricingRule.prototype, "maximumFare", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 4, scale: 2, default: 1.0, name: 'surge_multiplier' }),
    __metadata("design:type", Number)
], PricingRule.prototype, "surgeMultiplier", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, default: 'XOF' }),
    __metadata("design:type", String)
], PricingRule.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, name: 'time_conditions' }),
    __metadata("design:type", Object)
], PricingRule.prototype, "timeConditions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, name: 'day_conditions' }),
    __metadata("design:type", Object)
], PricingRule.prototype, "dayConditions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], PricingRule.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], PricingRule.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PricingRule.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], PricingRule.prototype, "updatedAt", void 0);
exports.PricingRule = PricingRule = __decorate([
    (0, typeorm_1.Entity)('pricing_rules'),
    (0, typeorm_1.Index)('idx_pricing_city_service', ['cityId', 'serviceType', 'isActive']),
    (0, typeorm_1.Index)('idx_pricing_priority', ['cityId', 'serviceType', 'priority'])
], PricingRule);
//# sourceMappingURL=pricing-rule.entity.js.map