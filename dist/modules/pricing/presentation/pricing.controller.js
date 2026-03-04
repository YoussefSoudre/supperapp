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
exports.PricingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const pricing_service_1 = require("../application/pricing.service");
let PricingController = class PricingController {
    pricingService;
    constructor(pricingService) {
        this.pricingService = pricingService;
    }
    estimate(req, body) {
        const now = new Date();
        const ctx = {
            cityId: req.user.cityId,
            serviceType: body.serviceType,
            distanceKm: body.distanceKm,
            durationMinutes: body.durationMinutes,
            hour: now.getHours(),
            dayOfWeek: now.getDay() || 7,
        };
        return this.pricingService.calculate(ctx);
    }
};
exports.PricingController = PricingController;
__decorate([
    (0, common_1.Post)('estimate'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PricingController.prototype, "estimate", null);
exports.PricingController = PricingController = __decorate([
    (0, swagger_1.ApiTags)('Pricing'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)({ path: 'pricing', version: '1' }),
    __metadata("design:paramtypes", [pricing_service_1.PricingService])
], PricingController);
//# sourceMappingURL=pricing.controller.js.map