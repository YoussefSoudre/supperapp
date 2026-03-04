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
exports.City = exports.CityStatus = void 0;
const typeorm_1 = require("typeorm");
var CityStatus;
(function (CityStatus) {
    CityStatus["ACTIVE"] = "active";
    CityStatus["INACTIVE"] = "inactive";
    CityStatus["COMING_SOON"] = "coming_soon";
})(CityStatus || (exports.CityStatus = CityStatus = {}));
let City = class City {
    id;
    name;
    slug;
    countryCode;
    currency;
    status;
    centerLat;
    centerLng;
    radiusKm;
    config;
    createdAt;
    updatedAt;
};
exports.City = City;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], City.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], City.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, unique: true }),
    __metadata("design:type", String)
], City.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, default: 'BF', name: 'country_code' }),
    __metadata("design:type", String)
], City.prototype, "countryCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, default: 'XOF' }),
    __metadata("design:type", String)
], City.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: CityStatus, default: CityStatus.ACTIVE }),
    __metadata("design:type", String)
], City.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, name: 'center_lat' }),
    __metadata("design:type", Number)
], City.prototype, "centerLat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, name: 'center_lng' }),
    __metadata("design:type", Number)
], City.prototype, "centerLng", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 30, name: 'radius_km' }),
    __metadata("design:type", Number)
], City.prototype, "radiusKm", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], City.prototype, "config", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], City.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], City.prototype, "updatedAt", void 0);
exports.City = City = __decorate([
    (0, typeorm_1.Entity)('cities'),
    (0, typeorm_1.Index)('idx_cities_slug', ['slug'], { unique: true }),
    (0, typeorm_1.Index)('idx_cities_country', ['countryCode', 'status'])
], City);
//# sourceMappingURL=city.entity.js.map