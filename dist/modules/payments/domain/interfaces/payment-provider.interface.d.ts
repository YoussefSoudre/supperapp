export interface IPaymentProvider {
    readonly name: string;
    initiate(req: PaymentRequest): Promise<PaymentIntent>;
    verify(txRef: string): Promise<PaymentVerification>;
    handleWebhook(payload: unknown): Promise<WebhookResult>;
}
export interface PaymentRequest {
    amount: number;
    currency: string;
    phone: string;
    reference: string;
    description: string;
    metadata?: Record<string, unknown>;
}
export interface PaymentIntent {
    providerReference: string;
    redirectUrl?: string;
    ussdCode?: string;
    status: 'pending' | 'processing';
}
export interface PaymentVerification {
    status: 'success' | 'failed' | 'pending';
    providerTxId?: string;
    amount?: number;
    failureReason?: string;
}
export interface WebhookResult {
    paymentId: string;
    status: 'success' | 'failed';
    providerTxId: string;
}
export declare const PAYMENT_PROVIDERS: unique symbol;
