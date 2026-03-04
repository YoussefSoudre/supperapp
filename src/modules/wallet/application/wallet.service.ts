import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Wallet, WalletStatus } from '../domain/entities/wallet.entity';
import { WalletTransaction, TransactionType, TransactionReason } from '../domain/entities/wallet-transaction.entity';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { DomainEvents, RideCompletedPayload, PaymentSuccessPayload } from '../../../shared/events/domain-events.constants';
import { PaginationHelper } from '../../../shared/helpers/pagination.helper';
import { PaginatedResult } from '../../../shared/interfaces/repository.interface';

/** Paramètres de filtrage pour l'historique des transactions */
export interface TxFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  // ─── Filtres standards ───────────────────
  dateFrom?: string;
  dateTo?: string;
  // ─── Filtres avancés ────────────────────
  type?: TransactionType;
  reason?: TransactionReason | TransactionReason[];
  minAmount?: number;
  maxAmount?: number;
}

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBusService,
  ) {}

  async findByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getTransactions(
    userId: string,
    params: TxFilterParams = {},
  ): Promise<PaginatedResult<WalletTransaction>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      dateFrom,
      dateTo,
      type,
      reason,
      minAmount,
      maxAmount,
    } = params;

    const wallet = await this.findByUserId(userId);

    const ALLOWED_SORT = ['createdAt', 'amount', 'balanceAfter'];
    const safeSort = ALLOWED_SORT.includes(sortBy) ? sortBy : 'createdAt';

    const qb = this.txRepo
      .createQueryBuilder('tx')
      .where('tx.walletId = :walletId', { walletId: wallet.id });

    // ─── Filtres standards ────────────────────────────────────────────────────
    if (dateFrom) qb.andWhere('tx.createdAt >= :dateFrom', { dateFrom });
    if (dateTo)   qb.andWhere('tx.createdAt <= :dateTo',   { dateTo });

    // ─── Filtres avancés ──────────────────────────────────────────────────────
    if (type)      qb.andWhere('tx.type = :type', { type });
    if (reason) {
      const reasons = Array.isArray(reason) ? reason : [reason];
      qb.andWhere('tx.reason IN (:...reasons)', { reasons });
    }
    if (minAmount !== undefined) qb.andWhere('tx.amount >= :minAmount', { minAmount });
    if (maxAmount !== undefined) qb.andWhere('tx.amount <= :maxAmount', { maxAmount });

    const { page: p, limit: l } = PaginationHelper.normalize({ page, limit });
    const [data, total] = await qb
      .orderBy(`tx.${safeSort}`, sortOrder)
      .skip(PaginationHelper.toOffset(p, l))
      .take(l)
      .getManyAndCount();

    return PaginationHelper.build(data, total, { page: p, limit: l });
  }

  /**
   * Crédit atomique avec SELECT FOR UPDATE
   * Utilise une transaction DB pour éviter les race conditions
   */
  async credit(userId: string, amountCentimes: number, reason: TransactionReason, referenceId?: string): Promise<WalletTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager
        .createQueryBuilder(Wallet, 'wallet')
        .where('wallet.userId = :userId', { userId })
        .setLock('pessimistic_write')
        .getOneOrFail();

      if (wallet.status !== WalletStatus.ACTIVE) {
        throw new BadRequestException('Wallet is not active');
      }

      const newBalance = Number(wallet.balance) + amountCentimes;
      await manager.update(Wallet, wallet.id, { balance: newBalance, version: wallet.version + 1 });

      const tx = manager.create(WalletTransaction, {
        walletId: wallet.id,
        type: TransactionType.CREDIT,
        reason,
        amount: amountCentimes,
        balanceAfter: newBalance,
        currency: wallet.currency,
        referenceId: referenceId ?? null,
      });

      const saved = await manager.save(WalletTransaction, tx);

      await this.eventBus.emit(DomainEvents.WALLET_CREDITED, {
        version: 1, userId, walletId: wallet.id, amount: amountCentimes,
        newBalance, reason, timestamp: new Date(),
      });

      return saved;
    });
  }

  /** Écoute ride.completed → crédit le chauffeur */
  @OnEvent(DomainEvents.RIDE_COMPLETED)
  async onRideCompleted(payload: RideCompletedPayload): Promise<void> {
    // Créditer 80% du prix au chauffeur (20% commission plateforme)
    const driverAmount = Math.floor(payload.amount * 80);
    await this.credit(payload.driverId, driverAmount, TransactionReason.RIDE_EARNING, payload.rideId);
  }

  /** Écoute payment.success → créditer le wallet si topup */
  @OnEvent(DomainEvents.PAYMENT_SUCCESS)
  async onPaymentSuccess(payload: PaymentSuccessPayload): Promise<void> {
    if (payload.serviceType === 'wallet_topup') {
      const amountCentimes = payload.amount * 100;
      await this.credit(payload.userId, amountCentimes, TransactionReason.TOPUP, payload.paymentId);
    }
  }
}
