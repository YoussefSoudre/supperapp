import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { Ride, RideStatus } from '../../domain/entities/ride.entity';
import { RideModificationLog } from '../../domain/entities/ride-modification-log.entity';
import { IRideRepository } from '../../domain/interfaces/ride-repository.interface';
import { FindAllOptions, PaginatedResult } from '../../../../shared/interfaces/repository.interface';

/** Colonnes autorisées pour le tri (protection contre injection SQL) */
const ALLOWED_SORT_COLUMNS = ['createdAt', 'scheduledAt', 'price', 'updatedAt'] as const;
type AllowedSort = typeof ALLOWED_SORT_COLUMNS[number];

/**
 * Adapter — Implémentation TypeORM du port IRideRepository.
 * Seul endroit où TypeORM est utilisé dans le module Rides.
 */
@Injectable()
export class RideRepository implements IRideRepository {
  constructor(
    @InjectRepository(Ride)
    private readonly repo: Repository<Ride>,
    @InjectRepository(RideModificationLog)
    private readonly modLogRepo: Repository<RideModificationLog>,
  ) {}

  async findById(id: string): Promise<Ride | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByUserId(
    userId: string,
    options: FindAllOptions = {},
  ): Promise<PaginatedResult<Ride>> {
    const {
      page = 1,
      limit = 20,
      filters = {},
      orderBy = 'createdAt',
      order = 'DESC',
    } = options;

    const safeSort: AllowedSort = ALLOWED_SORT_COLUMNS.includes(orderBy as AllowedSort)
      ? (orderBy as AllowedSort)
      : 'createdAt';

    const qb = this.repo.createQueryBuilder('ride')
      .where('ride.userId = :userId', { userId });

    this.applyCommonFilters(qb, filters);

    const [data, total] = await qb
      .orderBy(`ride.${safeSort}`, order)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByDriverId(
    driverId: string,
    options: FindAllOptions = {},
  ): Promise<PaginatedResult<Ride>> {
    const {
      page = 1,
      limit = 20,
      filters = {},
      orderBy = 'createdAt',
      order = 'DESC',
    } = options;

    const safeSort: AllowedSort = ALLOWED_SORT_COLUMNS.includes(orderBy as AllowedSort)
      ? (orderBy as AllowedSort)
      : 'createdAt';

    const qb = this.repo.createQueryBuilder('ride')
      .where('ride.driverId = :driverId', { driverId });

    this.applyCommonFilters(qb, filters);

    const [data, total] = await qb
      .orderBy(`ride.${safeSort}`, order)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Applique les filtres communs aux courses (status, type, cityId, dates, search).
   * Réutilisé par findByUserId et findByDriverId.
   */
  private applyCommonFilters(
    qb: ReturnType<Repository<Ride>['createQueryBuilder']>,
    filters: Record<string, unknown>,
  ): void {
    // ─── Filtres standards ───────────────────────────────────────────────────
    if (filters['status']) {
      const statuses = Array.isArray(filters['status'])
        ? filters['status']
        : [filters['status']];
      qb.andWhere('ride.status IN (:...statuses)', { statuses });
    }

    // ─── Filtres avancés ─────────────────────────────────────────────────────
    if (filters['type']) {
      const types = Array.isArray(filters['type']) ? filters['type'] : [filters['type']];
      qb.andWhere('ride.type IN (:...types)', { types });
    }

    if (filters['cityId']) {
      qb.andWhere('ride.cityId = :cityId', { cityId: filters['cityId'] });
    }

    if (filters['driverId']) {
      qb.andWhere('ride.driverId = :driverIdFilter', { driverIdFilter: filters['driverId'] });
    }

    if (filters['dateFrom']) {
      qb.andWhere('ride.createdAt >= :dateFrom', { dateFrom: filters['dateFrom'] });
    }

    if (filters['dateTo']) {
      qb.andWhere('ride.createdAt <= :dateTo', { dateTo: filters['dateTo'] });
    }

    if (filters['search']) {
      qb.andWhere(
        '(ride.pickupAddress ILIKE :search OR ride.dropoffAddress ILIKE :search)',
        { search: `%${filters['search']}%` },
      );
    }
  }

  async findPendingScheduled(before: Date): Promise<Ride[]> {
    return this.repo.find({
      where: {
        status: RideStatus.SCHEDULED,
        scheduledAt: LessThanOrEqual(before),
      },
    });
  }

  async save(rideData: Omit<Ride, 'id' | 'createdAt' | 'updatedAt'>): Promise<Ride> {
    const ride = this.repo.create(rideData);
    return this.repo.save(ride);
  }

  async update(id: string, data: Partial<Ride>): Promise<Ride> {
    await this.repo.update(id, data as any);
    return this.repo.findOneOrFail({ where: { id } });
  }

  async countActiveRidesByDriver(driverId: string): Promise<number> {
    return this.repo.count({
      where: {
        driverId,
        status: In([RideStatus.ACCEPTED, RideStatus.DRIVER_EN_ROUTE, RideStatus.IN_PROGRESS]),
      },
    });
  }

  async saveModificationLog(
    logData: Omit<RideModificationLog, 'id' | 'createdAt'>,
  ): Promise<RideModificationLog> {
    const log = this.modLogRepo.create(logData);
    return this.modLogRepo.save(log);
  }

  async findModificationLogs(rideId: string): Promise<RideModificationLog[]> {
    return this.modLogRepo.find({
      where: { rideId },
      order: { createdAt: 'ASC' },
    });
  }
}
