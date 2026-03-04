import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentProvider, PaymentServiceType } from '../domain/entities/payment.entity';
import { OrangeMoneyProvider } from '../infrastructure/providers/orange-money.provider';
import { MoovMoneyProvider } from '../infrastructure/providers/moov-money.provider';
import { IPaymentProvider } from '../domain/interfaces/payment-provider.interface';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { DomainEvents, PaymentSuccessPayload } from '../../../shared/events/domain-events.constants';

export interface InitiatePaymentDto {
  userId: string;
  serviceType: PaymentServiceType;
  referenceId: string;
  amount: number;
  provider: PaymentProvider;
  phone: string;
}

@Injectable()
export class PaymentsService {
  private readonly providers: Map<string, IPaymentProvider>;

  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
    private readonly eventBus: EventBusService,
    orangeMoney: OrangeMoneyProvider,
    moovMoney: MoovMoneyProvider,
  ) {
    this.providers = new Map<string, IPaymentProvider>([
      [orangeMoney.name, orangeMoney],
      [moovMoney.name, moovMoney],
    ]);
  }

  private getProvider(name: string): IPaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new BadRequestException(`Payment provider '${name}' not supported`);
    return provider;
  }

  async initiate(dto: InitiatePaymentDto): Promise<Payment> {
    const provider = this.getProvider(dto.provider);

    const payment = await this.repo.save(
      this.repo.create({
        userId: dto.userId,
        serviceType: dto.serviceType,
        referenceId: dto.referenceId,
        amount: dto.amount,
        currency: 'XOF',
        status: PaymentStatus.PENDING,
        provider: dto.provider,
        providerPhone: dto.phone,
      })
    );

    const intent = await provider.initiate({
      amount: dto.amount,
      currency: 'XOF',
      phone: dto.phone,
      reference: payment.id,
      description: `Paiement ${dto.serviceType}`,
    });

    await this.repo.update(payment.id, {
      status: PaymentStatus.PROCESSING,
      providerTxId: intent.providerReference,
    });

    await this.eventBus.emit(DomainEvents.PAYMENT_INITIATED, {
      version: 1, paymentId: payment.id, userId: dto.userId,
      amount: dto.amount, provider: dto.provider, timestamp: new Date(),
    });

    return { ...payment, status: PaymentStatus.PROCESSING };
  }

  async confirmSuccess(paymentId: string, providerTxId: string): Promise<void> {
    const payment = await this.repo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    await this.repo.update(paymentId, {
      status: PaymentStatus.SUCCESS,
      providerTxId,
      paidAt: new Date(),
    });

    const payload: PaymentSuccessPayload = {
      version: 1,
      paymentId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      serviceType: payment.serviceType,
      referenceId: payment.referenceId,
      provider: payment.provider,
      timestamp: new Date(),
    };

    await this.eventBus.emit(DomainEvents.PAYMENT_SUCCESS, payload);
  }
}
