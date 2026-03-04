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
exports.CreateRideDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const ride_entity_1 = require("../../domain/entities/ride.entity");
class CreateRideDto {
    type;
    pickupAddress;
    pickupLat;
    pickupLng;
    dropoffAddress;
    dropoffLat;
    dropoffLng;
    scheduledAt;
    promoCode;
}
exports.CreateRideDto = CreateRideDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ride_entity_1.RideType, example: ride_entity_1.RideType.MOTO }),
    (0, class_validator_1.IsEnum)(ride_entity_1.RideType),
    __metadata("design:type", String)
], CreateRideDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Rond-Point CAN, Ouagadougou' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRideDto.prototype, "pickupAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 12.3547 }),
    (0, class_validator_1.IsLatitude)(),
    __metadata("design:type", Number)
], CreateRideDto.prototype, "pickupLat", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: -1.5256 }),
    (0, class_validator_1.IsLongitude)(),
    __metadata("design:type", Number)
], CreateRideDto.prototype, "pickupLng", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Hôpital Yalgado, Ouagadougou' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRideDto.prototype, "dropoffAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 12.3648 }),
    (0, class_validator_1.IsLatitude)(),
    __metadata("design:type", Number)
], CreateRideDto.prototype, "dropoffLat", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: -1.5312 }),
    (0, class_validator_1.IsLongitude)(),
    __metadata("design:type", Number)
], CreateRideDto.prototype, "dropoffLng", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-03-15T08:00:00Z', description: 'Pour une course planifiée' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateRideDto.prototype, "scheduledAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateRideDto.prototype, "promoCode", void 0);
//# sourceMappingURL=create-ride.dto.js.map