import { Injectable, Logger } from '@nestjs/common';
import {
  IPaymentProvider, PaymentRequest, PaymentIntent,
  PaymentVerification, WebhookResult,
} from '../../domain/interfaces/payment-provider.interface';

@Injectable()
export class MoovMoneyProvider implements IPaymentProvider {
  readonly name = 'moov_money';
  private readonly logger = new Logger(MoovMoneyProvider.name);

  async initiate(req: PaymentRequest): Promise<PaymentIntent> {
    this.logger.log(`Initiating Moov Money payment: ${req.reference}`);
    // TODO: Appel API Moov Money BF
    return {
      providerReference: `MOOV-${req.reference}`,
      status: 'pending',
    };
  }

  async verify(txRef: string): Promise<PaymentVerification> {
    return { status: 'pending' };
  }

  async handleWebhook(payload: unknown): Promise<WebhookResult> {
    const data = payload as Record<string, string>;
    return {
      paymentId: data['paymentId'],
      status: 'success',
      providerTxId: data['transactionId'],
    };
  }
}
