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
var DispatchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DispatchService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const domain_events_constants_1 = require("../../../shared/events/domain-events.constants");
const event_bus_service_1 = require("../../../shared/events/event-bus.service");
let DispatchService = DispatchService_1 = class DispatchService {
    eventBus;
    logger = new common_1.Logger(DispatchService_1.name);
    SEARCH_RADIUS_KM = 5;
    MAX_RETRIES = 3;
    TIMEOUT_MS = 30_000;
    constructor(eventBus) {
        this.eventBus = eventBus;
    }
    async onRideRequested(payload) {
        this.logger.log(`Dispatching ride ${payload.rideId} in city ${payload.cityId}`);
        const drivers = [];
        if (drivers.length === 0) {
            this.logger.warn(`No driver found for ride ${payload.rideId}`);
            await this.eventBus.emit(domain_events_constants_1.DomainEvents.DISPATCH_NO_DRIVER_FOUND, {
                version: 1,
                rideId: payload.rideId,
                userId: payload.userId,
                cityId: payload.cityId,
                timestamp: new Date(),
            });
            return;
        }
        const scored = drivers
            .map((d) => ({
            ...d,
            score: this.score(d, payload.pickupLat, payload.pickupLng),
        }))
            .sort((a, b) => b.score - a.score);
        const bestDriver = scored[0];
        await this.eventBus.emit(domain_events_constants_1.DomainEvents.DISPATCH_DRIVER_ASSIGNED, {
            version: 1,
            rideId: payload.rideId,
            driverId: bestDriver.id,
            userId: payload.userId,
            timestamp: new Date(),
        });
    }
    score(driver, pickupLat, pickupLng) {
        const dist = this.haversineKm(driver.lat, driver.lng, pickupLat, pickupLng);
        const distScore = Math.max(0, 1 - dist / this.SEARCH_RADIUS_KM);
        const ratingScore = driver.rating / 5;
        return distScore * 0.6 + ratingScore * 0.4;
    }
    haversineKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
};
exports.DispatchService = DispatchService;
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_constants_1.DomainEvents.RIDE_REQUESTED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DispatchService.prototype, "onRideRequested", null);
exports.DispatchService = DispatchService = DispatchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService])
], DispatchService);
//# sourceMappingURL=dispatch.service.js.map