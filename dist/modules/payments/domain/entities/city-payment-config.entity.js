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
exports.CityPaymentConfig = void 0;
const typeorm_1 = require("typeorm");
let CityPaymentConfig = class CityPaymentConfig {
    id;
    cityId;
    provider;
    isEnabled;
    config;
    feePercent;
    feeFixed;
    priority;
    createdAt;
    updatedAt;
};
exports.CityPaymentConfig = CityPaymentConfig;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CityPaymentConfig.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'city_id' }),
    __metadata("design:type", String)
], CityPaymentConfig.prototype, "cityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], CityPaymentConfig.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true, name: 'is_enabled' }),
    __metadata("design:type", Boolean)
], CityPaymentConfig.prototype, "isEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'config' }),
    __metadata("design:type", Object)
], CityPaymentConfig.prototype, "config", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 4, default: 0, name: 'fee_percent' }),
    __metadata("design:type", Number)
], CityPaymentConfig.prototype, "feePercent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', default: 0, name: 'fee_fixed' }),
    __metadata("design:type", Number)
], CityPaymentConfig.prototype, "feeFixed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], CityPaymentConfig.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CityPaymentConfig.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CityPaymentConfig.prototype, "updatedAt", void 0);
exports.CityPaymentConfig = CityPaymentConfig = __decorate([
    (0, typeorm_1.Entity)('city_payment_configs'),
    (0, typeorm_1.Index)('idx_cpc_city_provider', ['cityId', 'provider'], { unique: true })
], CityPaymentConfig);
//# sourceMappingURL=city-payment-config.entity.js.map