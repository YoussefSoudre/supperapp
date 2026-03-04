import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery, DeliveryStatus, PackageSize } from '../domain/entities/delivery.entity';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { DomainEvents } from '../../../shared/events/domain-events.constants';

/** Filtres pour la liste des livraisons */
export interface DeliveryFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  dateFrom?: string;
  dateTo?: string;
  status?: DeliveryStatus | DeliveryStatus[];
  packageSize?: PackageSize | PackageSize[];
}

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(Delivery)
    private readonly repo: Repository<Delivery>,
    private readonly eventBus: EventBusService,
  ) {}

  async create(data: Partial<Delivery>): Promise<Delivery> {
    const delivery = await this.repo.save(this.repo.create(data));
    await this.eventBus.emit(DomainEvents.DELIVERY_CREATED, {
      version: 1, deliveryId: delivery.id, senderId: delivery.senderId,
      cityId: delivery.cityId, timestamp: new Date(),
    });
    return delivery;
  }

  async findBySenderId(
    senderId: string,
    params: DeliveryFilterParams = {},
  ) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      dateFrom,
      dateTo,
      status,
      packageSize,
    } = params;

    const ALLOWED_SORT = ['createdAt', 'price', 'updatedAt'];
    const safeSort = ALLOWED_SORT.includes(sortBy) ? sortBy : 'createdAt';

    const qb = this.repo
      .createQueryBuilder('d')
      .where('d.senderId = :senderId', { senderId });

    // ─── Filtres standards ─────────────────────────────────────────────────
    if (dateFrom) qb.andWhere('d.createdAt >= :dateFrom', { dateFrom });
    if (dateTo)   qb.andWhere('d.createdAt <= :dateTo',   { dateTo });

    // ─── Filtres avancés ──────────────────────────────────────────────────
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      qb.andWhere('d.status IN (:...statuses)', { statuses });
    }
    if (packageSize) {
      const sizes = Array.isArray(packageSize) ? packageSize : [packageSize];
      qb.andWhere('d.packageSize IN (:...sizes)', { sizes });
    }

    const skip = (page - 1) * limit;
    const [data, total] = await qb
      .orderBy(`d.${safeSort}`, sortOrder)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
