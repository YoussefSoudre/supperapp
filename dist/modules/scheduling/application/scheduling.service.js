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
var SchedulingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulingService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const event_bus_service_1 = require("../../../shared/events/event-bus.service");
let SchedulingService = SchedulingService_1 = class SchedulingService {
    eventBus;
    logger = new common_1.Logger(SchedulingService_1.name);
    constructor(eventBus) {
        this.eventBus = eventBus;
    }
    async processPendingScheduledRides() {
        this.logger.debug('Checking for scheduled rides to trigger...');
    }
    async cleanup() {
        this.logger.debug('Running hourly cleanup...');
    }
    async dailyConsolidation() {
        this.logger.log('Running daily stats consolidation...');
    }
};
exports.SchedulingService = SchedulingService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulingService.prototype, "processPendingScheduledRides", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulingService.prototype, "cleanup", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulingService.prototype, "dailyConsolidation", null);
exports.SchedulingService = SchedulingService = SchedulingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService])
], SchedulingService);
//# sourceMappingURL=scheduling.service.js.map