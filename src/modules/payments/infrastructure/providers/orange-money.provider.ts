import { Injectable, Logger } from '@nestjs/common';
import {
  IPaymentProvider, PaymentRequest, PaymentIntent,
  PaymentVerification, WebhookResult,
} from '../../domain/interfaces/payment-provider.interface';

/**
 * Orange Money Burkina Faso — Implémentation du provider.
 * API doc: https://developer.orange.com/apis/om-webpay-bf
 */
@Injectable()
export class OrangeMoneyProvider implements IPaymentProvider {
  readonly name = 'orange_money';
  private readonly logger = new Logger(OrangeMoneyProvider.name);

  async initiate(req: PaymentRequest): Promise<PaymentIntent> {
    this.logger.log(`Initiating Orange Money payment: ${req.reference}`);
    // TODO: Appel API Orange Money
    // const response = await axios.post('https://api.orange.com/orange-money-webpay/bf/v1/webpayment', ...)
    return {
      providerReference: `OM-${req.reference}`,
      ussdCode: `#144*4*6*${req.amount}*${req.phone}#`,
      status: 'pending',
    };
  }

  async verify(txRef: string): Promise<PaymentVerification> {
    this.logger.log(`Verifying Orange Money tx: ${txRef}`);
    // TODO: Appel API verification Orange Money
    return { status: 'pending' };
  }

  async handleWebhook(payload: unknown): Promise<WebhookResult> {
    const data = payload as Record<string, string>;
    return {
      paymentId: data['paymentId'],
      status: data['status'] === 'SUCCESS' ? 'success' : 'failed',
      providerTxId: data['txnId'],
    };
  }
}
