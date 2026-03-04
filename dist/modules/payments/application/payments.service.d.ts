import { Repository } from 'typeorm';
import { Payment, PaymentProvider, PaymentServiceType } from '../domain/entities/payment.entity';
import { OrangeMoneyProvider } from '../infrastructure/providers/orange-money.provider';
import { MoovMoneyProvider } from '../infrastructure/providers/moov-money.provider';
import { EventBusService } from '../../../shared/events/event-bus.service';
export interface InitiatePaymentDto {
    userId: string;
    serviceType: PaymentServiceType;
    referenceId: string;
    amount: number;
    provider: PaymentProvider;
    phone: string;
}
export declare class PaymentsService {
    private readonly repo;
    private readonly eventBus;
    private readonly providers;
    constructor(repo: Repository<Payment>, eventBus: EventBusService, orangeMoney: OrangeMoneyProvider, moovMoney: MoovMoneyProvider);
    private getProvider;
    initiate(dto: InitiatePaymentDto): Promise<Payment>;
    confirmSuccess(paymentId: string, providerTxId: string): Promise<void>;
}
