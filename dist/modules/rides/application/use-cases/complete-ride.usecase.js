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
exports.CompleteRideUseCase = void 0;
const common_1 = require("@nestjs/common");
const ride_repository_interface_1 = require("../../domain/interfaces/ride-repository.interface");
const ride_entity_1 = require("../../domain/entities/ride.entity");
const ride_status_vo_1 = require("../../domain/value-objects/ride-status.vo");
const event_bus_service_1 = require("../../../../shared/events/event-bus.service");
const domain_events_constants_1 = require("../../../../shared/events/domain-events.constants");
let CompleteRideUseCase = class CompleteRideUseCase {
    rideRepo;
    eventBus;
    constructor(rideRepo, eventBus) {
        this.rideRepo = rideRepo;
        this.eventBus = eventBus;
    }
    async execute(rideId, finalPrice) {
        const ride = await this.rideRepo.findById(rideId);
        if (!ride)
            throw new common_1.NotFoundException('Ride not found');
        if (!(0, ride_status_vo_1.canTransitionTo)(ride.status, ride_entity_1.RideStatus.COMPLETED)) {
            throw new common_1.BadRequestException(`Cannot complete ride in status: ${ride.status}`);
        }
        const updated = await this.rideRepo.update(rideId, {
            status: ride_entity_1.RideStatus.COMPLETED,
            finalPrice,
            completedAt: new Date(),
        });
        const payload = {
            version: 1,
            rideId,
            driverId: ride.driverId,
            userId: ride.userId,
            amount: finalPrice,
            currency: ride.currency,
            cityId: ride.cityId,
            serviceType: ride.type,
            surgeApplied: ride.surgeFactor > 1.0,
            timestamp: new Date(),
        };
        await this.eventBus.emit(domain_events_constants_1.DomainEvents.RIDE_COMPLETED, payload);
        return updated;
    }
};
exports.CompleteRideUseCase = CompleteRideUseCase;
exports.CompleteRideUseCase = CompleteRideUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(ride_repository_interface_1.RIDE_REPOSITORY)),
    __metadata("design:paramtypes", [Object, event_bus_service_1.EventBusService])
], CompleteRideUseCase);
//# sourceMappingURL=complete-ride.usecase.js.map