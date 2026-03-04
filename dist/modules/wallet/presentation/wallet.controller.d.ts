import { WalletService } from '../application/wallet.service';
export declare class WalletController {
    private readonly walletService;
    constructor(walletService: WalletService);
    getBalance(req: {
        user: {
            id: string;
        };
    }): Promise<import("../domain/entities/wallet.entity").Wallet>;
    getTransactions(req: {
        user: {
            id: string;
        };
    }, page?: number, limit?: number): Promise<{
        data: import("../domain/entities/wallet-transaction.entity").WalletTransaction[];
        total: number;
        page: number;
        limit: number;
    }>;
}
