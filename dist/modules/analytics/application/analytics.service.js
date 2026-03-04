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
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const domain_events_constants_1 = require("../../../shared/events/domain-events.constants");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    logger = new common_1.Logger(AnalyticsService_1.name);
    metrics = {
        totalRides: 0, totalRevenue: 0, ridesByCity: {},
    };
    onRideCompleted(payload) {
        this.metrics.totalRides++;
        this.metrics.totalRevenue += payload.amount;
        this.metrics.ridesByCity[payload.cityId] = (this.metrics.ridesByCity[payload.cityId] ?? 0) + 1;
        this.logger.debug(`Analytics: ride completed in ${payload.cityId}, total rides: ${this.metrics.totalRides}`);
    }
    getMetrics() {
        return {
            totalRides: this.metrics.totalRides,
            totalRevenueXOF: this.metrics.totalRevenue,
            ridesByCity: this.metrics.ridesByCity,
        };
    }
};
exports.AnalyticsService = AnalyticsService;
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_constants_1.DomainEvents.RIDE_COMPLETED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalyticsService.prototype, "onRideCompleted", null);
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)()
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map