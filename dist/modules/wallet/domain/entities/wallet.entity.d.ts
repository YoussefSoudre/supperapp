export declare enum WalletStatus {
    ACTIVE = "active",
    FROZEN = "frozen",
    CLOSED = "closed"
}
export declare class Wallet {
    id: string;
    userId: string;
    balance: number;
    currency: string;
    status: WalletStatus;
    dailyWithdrawalLimit: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}
