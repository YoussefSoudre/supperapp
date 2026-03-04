export declare enum PaymentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    SUCCESS = "success",
    FAILED = "failed",
    REFUNDED = "refunded",
    CANCELLED = "cancelled"
}
export declare enum PaymentProvider {
    ORANGE_MONEY = "orange_money",
    MOOV_MONEY = "moov_money",
    CORIS_BANK = "coris_bank",
    WALLET = "wallet",
    CASH = "cash"
}
export declare enum PaymentServiceType {
    RIDE = "ride",
    DELIVERY = "delivery",
    FOOD = "food",
    WALLET_TOPUP = "wallet_topup",
    WITHDRAWAL = "withdrawal"
}
export declare class Payment {
    id: string;
    userId: string;
    serviceType: PaymentServiceType;
    referenceId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    provider: PaymentProvider;
    providerPhone: string | null;
    providerTxId: string | null;
    providerResponse: Record<string, unknown> | null;
    paidAt: Date | null;
    retryCount: number;
    failureReason: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}
