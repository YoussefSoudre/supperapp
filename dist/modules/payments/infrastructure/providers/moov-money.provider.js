"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MoovMoneyProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoovMoneyProvider = void 0;
const common_1 = require("@nestjs/common");
let MoovMoneyProvider = MoovMoneyProvider_1 = class MoovMoneyProvider {
    name = 'moov_money';
    logger = new common_1.Logger(MoovMoneyProvider_1.name);
    async initiate(req) {
        this.logger.log(`Initiating Moov Money payment: ${req.reference}`);
        return {
            providerReference: `MOOV-${req.reference}`,
            status: 'pending',
        };
    }
    async verify(txRef) {
        return { status: 'pending' };
    }
    async handleWebhook(payload) {
        const data = payload;
        return {
            paymentId: data['paymentId'],
            status: 'success',
            providerTxId: data['transactionId'],
        };
    }
};
exports.MoovMoneyProvider = MoovMoneyProvider;
exports.MoovMoneyProvider = MoovMoneyProvider = MoovMoneyProvider_1 = __decorate([
    (0, common_1.Injectable)()
], MoovMoneyProvider);
//# sourceMappingURL=moov-money.provider.js.map