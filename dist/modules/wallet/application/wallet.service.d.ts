import { Repository, DataSource } from 'typeorm';
import { Wallet } from '../domain/entities/wallet.entity';
import { WalletTransaction, TransactionReason } from '../domain/entities/wallet-transaction.entity';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { RideCompletedPayload, PaymentSuccessPayload } from '../../../shared/events/domain-events.constants';
export declare class WalletService {
    private readonly walletRepo;
    private readonly txRepo;
    private readonly dataSource;
    private readonly eventBus;
    constructor(walletRepo: Repository<Wallet>, txRepo: Repository<WalletTransaction>, dataSource: DataSource, eventBus: EventBusService);
    findByUserId(userId: string): Promise<Wallet>;
    getTransactions(userId: string, page?: number, limit?: number): Promise<{
        data: WalletTransaction[];
        total: number;
        page: number;
        limit: number;
    }>;
    credit(userId: string, amountCentimes: number, reason: TransactionReason, referenceId?: string): Promise<WalletTransaction>;
    onRideCompleted(payload: RideCompletedPayload): Promise<void>;
    onPaymentSuccess(payload: PaymentSuccessPayload): Promise<void>;
}
