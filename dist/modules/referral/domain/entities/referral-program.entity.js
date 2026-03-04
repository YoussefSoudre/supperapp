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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralProgram = exports.RewardType = void 0;
const typeorm_1 = require("typeorm");
var RewardType;
(function (RewardType) {
    RewardType["WALLET_CREDIT"] = "wallet_credit";
    RewardType["DISCOUNT"] = "discount";
    RewardType["FREE_RIDE"] = "free_ride";
})(RewardType || (exports.RewardType = RewardType = {}));
let ReferralProgram = class ReferralProgram {
    id;
    name;
    cityId;
    referrerRewardType;
    referrerRewardAmount;
    refereeRewardType;
    refereeRewardAmount;
    triggerAfterTrips;
    expiresAt;
    isActive;
    createdAt;
    updatedAt;
};
exports.ReferralProgram = ReferralProgram;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ReferralProgram.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], ReferralProgram.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'city_id' }),
    __metadata("design:type", Object)
], ReferralProgram.prototype, "cityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: RewardType, name: 'referrer_reward_type' }),
    __metadata("design:type", String)
], ReferralProgram.prototype, "referrerRewardType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', name: 'referrer_reward_amount' }),
    __metadata("design:type", Number)
], ReferralProgram.prototype, "referrerRewardAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: RewardType, name: 'referee_reward_type' }),
    __metadata("design:type", String)
], ReferralProgram.prototype, "refereeRewardType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', name: 'referee_reward_amount' }),
    __metadata("design:type", Number)
], ReferralProgram.prototype, "refereeRewardAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 1, name: 'trigger_after_trips' }),
    __metadata("design:type", Number)
], ReferralProgram.prototype, "triggerAfterTrips", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'expires_at' }),
    __metadata("design:type", Object)
], ReferralProgram.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], ReferralProgram.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ReferralProgram.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ReferralProgram.prototype, "updatedAt", void 0);
exports.ReferralProgram = ReferralProgram = __decorate([
    (0, typeorm_1.Entity)('referral_programs'),
    (0, typeorm_1.Index)('idx_rp_city_active', ['cityId', 'isActive'])
], ReferralProgram);
//# sourceMappingURL=referral-program.entity.js.map