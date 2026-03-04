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
exports.PricingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const pricing_rule_entity_1 = require("../domain/entities/pricing-rule.entity");
let PricingService = class PricingService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async calculate(ctx) {
        const rules = await this.repo.find({
            where: {
                cityId: ctx.cityId,
                serviceType: ctx.serviceType,
                isActive: true,
            },
            order: { priority: 'DESC' },
        });
        if (!rules.length) {
            throw new Error(`No pricing rule found for ${ctx.serviceType} in city ${ctx.cityId}`);
        }
        const rule = this.findApplicableRule(rules, ctx) ?? rules[rules.length - 1];
        const baseFare = Number(rule.baseFare);
        const distanceCost = Number(rule.perKmRate) * ctx.distanceKm;
        const timeCost = Number(rule.perMinuteRate) * ctx.durationMinutes;
        const rawPrice = baseFare + distanceCost + timeCost;
        const surgedPrice = rawPrice * Number(rule.surgeMultiplier);
        const finalPrice = Math.max(Number(rule.minimumFare), rule.maximumFare ? Math.min(surgedPrice, Number(rule.maximumFare)) : surgedPrice);
        return {
            price: Math.round(finalPrice),
            currency: rule.currency,
            ruleId: rule.id,
            surgeFactor: Number(rule.surgeMultiplier),
            breakdown: {
                baseFare: Math.round(baseFare),
                distanceCost: Math.round(distanceCost),
                timeCost: Math.round(timeCost),
                surgeAmount: Math.round(surgedPrice - rawPrice),
            },
        };
    }
    findApplicableRule(rules, ctx) {
        return rules.find((rule) => {
            if (rule.timeConditions) {
                const { start, end } = rule.timeConditions;
                const [startH] = start.split(':').map(Number);
                const [endH] = end.split(':').map(Number);
                const inTime = startH > endH
                    ? ctx.hour >= startH || ctx.hour < endH
                    : ctx.hour >= startH && ctx.hour < endH;
                if (!inTime)
                    return false;
            }
            if (rule.dayConditions && !rule.dayConditions.includes(ctx.dayOfWeek)) {
                return false;
            }
            return true;
        }) ?? null;
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(pricing_rule_entity_1.PricingRule)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PricingService);
//# sourceMappingURL=pricing.service.js.map