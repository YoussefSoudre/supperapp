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
var ReferralService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const typeorm_3 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const referral_program_entity_1 = require("../domain/entities/referral-program.entity");
const referral_usage_entity_1 = require("../domain/entities/referral-usage.entity");
const domain_events_constants_1 = require("../../../shared/events/domain-events.constants");
const event_bus_service_1 = require("../../../shared/events/event-bus.service");
let ReferralService = ReferralService_1 = class ReferralService {
    programRepo;
    usageRepo;
    eventBus;
    logger = new common_1.Logger(ReferralService_1.name);
    constructor(programRepo, usageRepo, eventBus) {
        this.programRepo = programRepo;
        this.usageRepo = usageRepo;
        this.eventBus = eventBus;
    }
    async onUserRegistered(payload) {
        if (!payload.referralCode)
            return;
        const program = await this.programRepo.findOne({
            where: [
                { cityId: payload.cityId, isActive: true },
                { cityId: (0, typeorm_1.IsNull)(), isActive: true },
            ],
        });
        if (!program)
            return;
        this.logger.log(`Referral usage created for user ${payload.userId} with code ${payload.referralCode}`);
    }
    async onRideCompleted(payload) {
        const usage = await this.usageRepo.findOne({
            where: { refereeId: payload.userId, status: referral_usage_entity_1.ReferralUsageStatus.PENDING },
        });
        if (!usage)
            return;
        const program = await this.programRepo.findOne({ where: { id: usage.programId } });
        if (!program)
            return;
        await this.usageRepo.update(usage.id, {
            tripsCompleted: usage.tripsCompleted + 1,
        });
        if (usage.tripsCompleted + 1 >= program.triggerAfterTrips) {
            await this.usageRepo.update(usage.id, {
                status: referral_usage_entity_1.ReferralUsageStatus.COMPLETED,
            });
            await this.eventBus.emit(domain_events_constants_1.DomainEvents.REFERRAL_REWARD_GRANTED, {
                version: 1,
                referrerId: usage.referrerId,
                refereeId: usage.refereeId,
                programId: program.id,
                referrerAmount: program.referrerRewardAmount,
                refereeAmount: program.refereeRewardAmount,
                timestamp: new Date(),
            });
        }
    }
};
exports.ReferralService = ReferralService;
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_constants_1.DomainEvents.USER_REGISTERED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReferralService.prototype, "onUserRegistered", null);
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_constants_1.DomainEvents.RIDE_COMPLETED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReferralService.prototype, "onRideCompleted", null);
exports.ReferralService = ReferralService = ReferralService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(referral_program_entity_1.ReferralProgram)),
    __param(1, (0, typeorm_2.InjectRepository)(referral_usage_entity_1.ReferralUsage)),
    __metadata("design:paramtypes", [typeorm_3.Repository,
        typeorm_3.Repository,
        event_bus_service_1.EventBusService])
], ReferralService);
//# sourceMappingURL=referral.service.js.map