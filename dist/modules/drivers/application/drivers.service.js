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
exports.DriversService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const driver_entity_1 = require("../domain/entities/driver.entity");
const domain_events_constants_1 = require("../../../shared/events/domain-events.constants");
const event_bus_service_1 = require("../../../shared/events/event-bus.service");
let DriversService = class DriversService {
    repo;
    eventBus;
    constructor(repo, eventBus) {
        this.repo = repo;
        this.eventBus = eventBus;
    }
    async findByUserId(userId) {
        const driver = await this.repo.findOne({ where: { userId } });
        if (!driver)
            throw new common_1.NotFoundException('Driver profile not found');
        return driver;
    }
    async findAvailableNear(lat, lng, radiusKm, cityId) {
        return this.repo
            .createQueryBuilder('driver')
            .where('driver.status = :status', { status: driver_entity_1.DriverStatus.ONLINE })
            .andWhere('driver.cityId = :cityId', { cityId })
            .andWhere(`
        (6371 * acos(
          cos(radians(:lat)) * cos(radians(driver.lastLat)) *
          cos(radians(driver.lastLng) - radians(:lng)) +
          sin(radians(:lat)) * sin(radians(driver.lastLat))
        )) < :radius`, { lat, lng, radius: radiusKm })
            .orderBy('driver.rating', 'DESC')
            .limit(10)
            .getMany();
    }
    async setOnline(userId) {
        const driver = await this.findByUserId(userId);
        await this.repo.update(driver.id, { status: driver_entity_1.DriverStatus.ONLINE });
        await this.eventBus.emit(domain_events_constants_1.DomainEvents.DRIVER_WENT_ONLINE, {
            version: 1, driverId: driver.id, cityId: driver.cityId, timestamp: new Date(),
        });
    }
    async setOffline(userId) {
        const driver = await this.findByUserId(userId);
        await this.repo.update(driver.id, { status: driver_entity_1.DriverStatus.OFFLINE });
        await this.eventBus.emit(domain_events_constants_1.DomainEvents.DRIVER_WENT_OFFLINE, {
            version: 1, driverId: driver.id, timestamp: new Date(),
        });
    }
    async handleLocationUpdate(payload) {
        await this.repo.update({ id: payload.driverId }, { lastLat: payload.lat, lastLng: payload.lng, lastSeenAt: new Date() });
    }
};
exports.DriversService = DriversService;
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_constants_1.DomainEvents.DRIVER_LOCATION_UPDATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriversService.prototype, "handleLocationUpdate", null);
exports.DriversService = DriversService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(driver_entity_1.Driver)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        event_bus_service_1.EventBusService])
], DriversService);
//# sourceMappingURL=drivers.service.js.map