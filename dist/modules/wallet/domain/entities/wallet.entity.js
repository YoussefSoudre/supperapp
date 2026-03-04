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
exports.Wallet = exports.WalletStatus = void 0;
const typeorm_1 = require("typeorm");
var WalletStatus;
(function (WalletStatus) {
    WalletStatus["ACTIVE"] = "active";
    WalletStatus["FROZEN"] = "frozen";
    WalletStatus["CLOSED"] = "closed";
})(WalletStatus || (exports.WalletStatus = WalletStatus = {}));
let Wallet = class Wallet {
    id;
    userId;
    balance;
    currency;
    status;
    dailyWithdrawalLimit;
    version;
    createdAt;
    updatedAt;
};
exports.Wallet = Wallet;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Wallet.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id', unique: true }),
    __metadata("design:type", String)
], Wallet.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', default: 0 }),
    __metadata("design:type", Number)
], Wallet.prototype, "balance", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, default: 'XOF' }),
    __metadata("design:type", String)
], Wallet.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: WalletStatus, default: WalletStatus.ACTIVE }),
    __metadata("design:type", String)
], Wallet.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', default: 10000000, name: 'daily_withdrawal_limit' }),
    __metadata("design:type", Number)
], Wallet.prototype, "dailyWithdrawalLimit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0, name: 'version' }),
    __metadata("design:type", Number)
], Wallet.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Wallet.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Wallet.prototype, "updatedAt", void 0);
exports.Wallet = Wallet = __decorate([
    (0, typeorm_1.Entity)('wallets'),
    (0, typeorm_1.Index)('idx_wallets_user', ['userId'], { unique: true })
], Wallet);
//# sourceMappingURL=wallet.entity.js.map