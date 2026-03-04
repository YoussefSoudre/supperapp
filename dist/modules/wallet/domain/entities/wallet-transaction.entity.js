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
exports.WalletTransaction = exports.TransactionReason = exports.TransactionType = void 0;
const typeorm_1 = require("typeorm");
var TransactionType;
(function (TransactionType) {
    TransactionType["CREDIT"] = "credit";
    TransactionType["DEBIT"] = "debit";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionReason;
(function (TransactionReason) {
    TransactionReason["RIDE_PAYMENT"] = "ride_payment";
    TransactionReason["RIDE_EARNING"] = "ride_earning";
    TransactionReason["DELIVERY_PAYMENT"] = "delivery_payment";
    TransactionReason["DELIVERY_EARNING"] = "delivery_earning";
    TransactionReason["FOOD_PAYMENT"] = "food_payment";
    TransactionReason["TOPUP"] = "topup";
    TransactionReason["WITHDRAWAL"] = "withdrawal";
    TransactionReason["REFERRAL_BONUS"] = "referral_bonus";
    TransactionReason["PROMO_CREDIT"] = "promo_credit";
    TransactionReason["REFUND"] = "refund";
    TransactionReason["ADMIN_ADJUSTMENT"] = "admin_adjustment";
})(TransactionReason || (exports.TransactionReason = TransactionReason = {}));
let WalletTransaction = class WalletTransaction {
    id;
    walletId;
    type;
    reason;
    amount;
    balanceAfter;
    currency;
    referenceId;
    description;
    metadata;
    createdAt;
};
exports.WalletTransaction = WalletTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WalletTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'wallet_id' }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "walletId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TransactionType }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TransactionReason }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint' }),
    __metadata("design:type", Number)
], WalletTransaction.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', name: 'balance_after' }),
    __metadata("design:type", Number)
], WalletTransaction.prototype, "balanceAfter", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, default: 'XOF' }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'reference_id' }),
    __metadata("design:type", Object)
], WalletTransaction.prototype, "referenceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], WalletTransaction.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], WalletTransaction.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], WalletTransaction.prototype, "createdAt", void 0);
exports.WalletTransaction = WalletTransaction = __decorate([
    (0, typeorm_1.Entity)('wallet_transactions'),
    (0, typeorm_1.Index)('idx_wtx_wallet', ['walletId', 'createdAt']),
    (0, typeorm_1.Index)('idx_wtx_reference', ['referenceId', 'reason']),
    (0, typeorm_1.Index)('idx_wtx_wallet_type', ['walletId', 'type', 'createdAt'])
], WalletTransaction);
//# sourceMappingURL=wallet-transaction.entity.js.map