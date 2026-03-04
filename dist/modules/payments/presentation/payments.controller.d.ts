import { PaymentsService } from '../application/payments.service';
import { PaymentProvider, PaymentServiceType } from '../domain/entities/payment.entity';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    initiate(req: {
        user: {
            id: string;
        };
    }, body: {
        serviceType: PaymentServiceType;
        referenceId: string;
        amount: number;
        provider: PaymentProvider;
        phone: string;
    }): Promise<import("../domain/entities/payment.entity").Payment>;
    confirm(id: string, providerTxId: string): Promise<void>;
}
