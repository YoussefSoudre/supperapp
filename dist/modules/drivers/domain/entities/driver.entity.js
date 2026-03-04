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
exports.Driver = exports.VehicleType = exports.DriverStatus = void 0;
const typeorm_1 = require("typeorm");
var DriverStatus;
(function (DriverStatus) {
    DriverStatus["PENDING_APPROVAL"] = "pending_approval";
    DriverStatus["ACTIVE"] = "active";
    DriverStatus["SUSPENDED"] = "suspended";
    DriverStatus["OFFLINE"] = "offline";
    DriverStatus["ONLINE"] = "online";
    DriverStatus["ON_TRIP"] = "on_trip";
})(DriverStatus || (exports.DriverStatus = DriverStatus = {}));
var VehicleType;
(function (VehicleType) {
    VehicleType["MOTO"] = "moto";
    VehicleType["CAR"] = "car";
    VehicleType["PICKUP"] = "pickup";
    VehicleType["BIKE"] = "bike";
})(VehicleType || (exports.VehicleType = VehicleType = {}));
let Driver = class Driver {
    id;
    userId;
    cityId;
    status;
    vehicleType;
    vehiclePlate;
    vehicleModel;
    lastLat;
    lastLng;
    lastSeenAt;
    rating;
    totalTrips;
    documents;
    documentsVerified;
    acceptsCash;
    createdAt;
    updatedAt;
};
exports.Driver = Driver;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Driver.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id', unique: true }),
    __metadata("design:type", String)
], Driver.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'city_id' }),
    __metadata("design:type", String)
], Driver.prototype, "cityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: DriverStatus, default: DriverStatus.PENDING_APPROVAL }),
    __metadata("design:type", String)
], Driver.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: VehicleType }),
    __metadata("design:type", String)
], Driver.prototype, "vehicleType", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, name: 'vehicle_plate' }),
    __metadata("design:type", String)
], Driver.prototype, "vehiclePlate", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, name: 'vehicle_model', nullable: true }),
    __metadata("design:type", Object)
], Driver.prototype, "vehicleModel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'last_lat' }),
    __metadata("design:type", Object)
], Driver.prototype, "lastLat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'last_lng' }),
    __metadata("design:type", Object)
], Driver.prototype, "lastLng", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'last_seen_at' }),
    __metadata("design:type", Object)
], Driver.prototype, "lastSeenAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, default: 5.0 }),
    __metadata("design:type", Number)
], Driver.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0, name: 'total_trips' }),
    __metadata("design:type", Number)
], Driver.prototype, "totalTrips", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Driver.prototype, "documents", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false, name: 'documents_verified' }),
    __metadata("design:type", Boolean)
], Driver.prototype, "documentsVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true, name: 'accepts_cash' }),
    __metadata("design:type", Boolean)
], Driver.prototype, "acceptsCash", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Driver.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Driver.prototype, "updatedAt", void 0);
exports.Driver = Driver = __decorate([
    (0, typeorm_1.Entity)('drivers'),
    (0, typeorm_1.Index)('idx_drivers_user', ['userId'], { unique: true }),
    (0, typeorm_1.Index)('idx_drivers_city_status', ['cityId', 'status']),
    (0, typeorm_1.Index)('idx_drivers_vehicle', ['vehicleType', 'status']),
    (0, typeorm_1.Index)('idx_drivers_location', ['lastLat', 'lastLng'])
], Driver);
//# sourceMappingURL=driver.entity.js.map