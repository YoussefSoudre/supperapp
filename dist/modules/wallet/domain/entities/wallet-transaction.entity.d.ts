export declare enum TransactionType {
    CREDIT = "credit",
    DEBIT = "debit"
}
export declare enum TransactionReason {
    RIDE_PAYMENT = "ride_payment",
    RIDE_EARNING = "ride_earning",
    DELIVERY_PAYMENT = "delivery_payment",
    DELIVERY_EARNING = "delivery_earning",
    FOOD_PAYMENT = "food_payment",
    TOPUP = "topup",
    WITHDRAWAL = "withdrawal",
    REFERRAL_BONUS = "referral_bonus",
    PROMO_CREDIT = "promo_credit",
    REFUND = "refund",
    ADMIN_ADJUSTMENT = "admin_adjustment"
}
export declare class WalletTransaction {
    id: string;
    walletId: string;
    type: TransactionType;
    reason: TransactionReason;
    amount: number;
    balanceAfter: number;
    currency: string;
    referenceId: string | null;
    description: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
}
