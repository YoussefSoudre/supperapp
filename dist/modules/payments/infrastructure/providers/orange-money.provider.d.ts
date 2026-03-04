import { IPaymentProvider, PaymentRequest, PaymentIntent, PaymentVerification, WebhookResult } from '../../domain/interfaces/payment-provider.interface';
export declare class OrangeMoneyProvider implements IPaymentProvider {
    readonly name = "orange_money";
    private readonly logger;
    initiate(req: PaymentRequest): Promise<PaymentIntent>;
    verify(txRef: string): Promise<PaymentVerification>;
    handleWebhook(payload: unknown): Promise<WebhookResult>;
}
