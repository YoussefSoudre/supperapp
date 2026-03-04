"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var OrangeMoneyProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrangeMoneyProvider = void 0;
const common_1 = require("@nestjs/common");
let OrangeMoneyProvider = OrangeMoneyProvider_1 = class OrangeMoneyProvider {
    name = 'orange_money';
    logger = new common_1.Logger(OrangeMoneyProvider_1.name);
    async initiate(req) {
        this.logger.log(`Initiating Orange Money payment: ${req.reference}`);
        return {
            providerReference: `OM-${req.reference}`,
            ussdCode: `#144*4*6*${req.amount}*${req.phone}#`,
            status: 'pending',
        };
    }
    async verify(txRef) {
        this.logger.log(`Verifying Orange Money tx: ${txRef}`);
        return { status: 'pending' };
    }
    async handleWebhook(payload) {
        const data = payload;
        return {
            paymentId: data['paymentId'],
            status: data['status'] === 'SUCCESS' ? 'success' : 'failed',
            providerTxId: data['txnId'],
        };
    }
};
exports.OrangeMoneyProvider = OrangeMoneyProvider;
exports.OrangeMoneyProvider = OrangeMoneyProvider = OrangeMoneyProvider_1 = __decorate([
    (0, common_1.Injectable)()
], OrangeMoneyProvider);
//# sourceMappingURL=orange-money.provider.js.map