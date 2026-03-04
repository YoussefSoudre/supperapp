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
exports.ReferralUsage = exports.ReferralUsageStatus = void 0;
const typeorm_1 = require("typeorm");
var ReferralUsageStatus;
(function (ReferralUsageStatus) {
    ReferralUsageStatus["PENDING"] = "pending";
    ReferralUsageStatus["COMPLETED"] = "completed";
    ReferralUsageStatus["REWARDED"] = "rewarded";
    ReferralUsageStatus["EXPIRED"] = "expired";
})(ReferralUsageStatus || (exports.ReferralUsageStatus = ReferralUsageStatus = {}));
let ReferralUsage = class ReferralUsage {
    id;
    programId;
    referrerId;
    refereeId;
    status;
    tripsCompleted;
    rewardedAt;
    createdAt;
};
exports.ReferralUsage = ReferralUsage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ReferralUsage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'program_id' }),
    __metadata("design:type", String)
], ReferralUsage.prototype, "programId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'referrer_id' }),
    __metadata("design:type", String)
], ReferralUsage.prototype, "referrerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'referee_id', unique: true }),
    __metadata("design:type", String)
], ReferralUsage.prototype, "refereeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ReferralUsageStatus, default: ReferralUsageStatus.PENDING }),
    __metadata("design:type", String)
], ReferralUsage.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0, name: 'trips_completed' }),
    __metadata("design:type", Number)
], ReferralUsage.prototype, "tripsCompleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'rewarded_at' }),
    __metadata("design:type", Object)
], ReferralUsage.prototype, "rewardedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ReferralUsage.prototype, "createdAt", void 0);
exports.ReferralUsage = ReferralUsage = __decorate([
    (0, typeorm_1.Entity)('referral_usages'),
    (0, typeorm_1.Index)('idx_ru_referrer', ['referrerId', 'status']),
    (0, typeorm_1.Index)('idx_ru_referee', ['refereeId'], { unique: true }),
    (0, typeorm_1.Index)('idx_ru_program', ['programId'])
], ReferralUsage);
//# sourceMappingURL=referral-usage.entity.js.map