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
exports.CreateRideUseCase = void 0;
const common_1 = require("@nestjs/common");
const ride_repository_interface_1 = require("../../domain/interfaces/ride-repository.interface");
const ride_entity_1 = require("../../domain/entities/ride.entity");
const event_bus_service_1 = require("../../../../shared/events/event-bus.service");
const domain_events_constants_1 = require("../../../../shared/events/domain-events.constants");
let CreateRideUseCase = class CreateRideUseCase {
    rideRepo;
    eventBus;
    constructor(rideRepo, eventBus) {
        this.rideRepo = rideRepo;
        this.eventBus = eventBus;
    }
    async execute(userId, cityId, dto) {
        const existingRides = await this.rideRepo.findByUserId(userId, {
            filters: { status: [ride_entity_1.RideStatus.PENDING, ride_entity_1.RideStatus.SEARCHING, ride_entity_1.RideStatus.IN_PROGRESS] },
        });
        if (existingRides.total > 0) {
            throw new common_1.BadRequestException('You already have an active ride');
        }
        const status = dto.scheduledAt ? ride_entity_1.RideStatus.SCHEDULED : ride_entity_1.RideStatus.PENDING;
        const ride = await this.rideRepo.save({
            userId,
            cityId,
            driverId: null,
            type: dto.type,
            status,
            pickupAddress: dto.pickupAddress,
            pickupLat: dto.pickupLat,
            pickupLng: dto.pickupLng,
            dropoffAddress: dto.dropoffAddress,
            dropoffLat: dto.dropoffLat,
            dropoffLng: dto.dropoffLng,
            estimatedPrice: 0,
            finalPrice: null,
            currency: 'XOF',
            surgeFactor: 1.0,
            pricingRuleId: null,
            distanceKm: null,
            durationSeconds: null,
            acceptedAt: null,
            startedAt: null,
            completedAt: null,
            cancelledAt: null,
            scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
            cancelledBy: null,
            cancellationReason: null,
            paymentId: null,
            isPaid: false,
            userRating: null,
            driverRating: null,
            userComment: null,
            metadata: null,
        });
        const eventName = dto.scheduledAt ? domain_events_constants_1.DomainEvents.RIDE_SCHEDULED : domain_events_constants_1.DomainEvents.RIDE_REQUESTED;
        await this.eventBus.emit(eventName, {
            version: 1,
            rideId: ride.id,
            userId,
            cityId,
            type: dto.type,
            pickupLat: dto.pickupLat,
            pickupLng: dto.pickupLng,
            scheduledAt: dto.scheduledAt,
            timestamp: new Date(),
        });
        return ride;
    }
};
exports.CreateRideUseCase = CreateRideUseCase;
exports.CreateRideUseCase = CreateRideUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(ride_repository_interface_1.RIDE_REPOSITORY)),
    __metadata("design:paramtypes", [Object, event_bus_service_1.EventBusService])
], CreateRideUseCase);
//# sourceMappingURL=create-ride.usecase.js.map