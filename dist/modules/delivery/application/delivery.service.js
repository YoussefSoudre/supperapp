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
exports.DeliveryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const delivery_entity_1 = require("../domain/entities/delivery.entity");
const event_bus_service_1 = require("../../../shared/events/event-bus.service");
const domain_events_constants_1 = require("../../../shared/events/domain-events.constants");
let DeliveryService = class DeliveryService {
    repo;
    eventBus;
    constructor(repo, eventBus) {
        this.repo = repo;
        this.eventBus = eventBus;
    }
    async create(data) {
        const delivery = await this.repo.save(this.repo.create(data));
        await this.eventBus.emit(domain_events_constants_1.DomainEvents.DELIVERY_CREATED, {
            version: 1, deliveryId: delivery.id, senderId: delivery.senderId,
            cityId: delivery.cityId, timestamp: new Date(),
        });
        return delivery;
    }
    async findBySenderId(senderId, page = 1, limit = 20) {
        const [data, total] = await this.repo.findAndCount({
            where: { senderId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit };
    }
};
exports.DeliveryService = DeliveryService;
exports.DeliveryService = DeliveryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(delivery_entity_1.Delivery)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        event_bus_service_1.EventBusService])
], DeliveryService);
//# sourceMappingURL=delivery.service.js.map