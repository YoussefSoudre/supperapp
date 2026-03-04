import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodOrder, FoodOrderStatus } from '../domain/entities/food-order.entity';
import { Restaurant } from '../domain/entities/restaurant.entity';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { DomainEvents } from '../../../shared/events/domain-events.constants';
import { PaginationHelper } from '../../../shared/helpers/pagination.helper';
import { PaginatedResult } from '../../../shared/interfaces/repository.interface';

/** Filtres pour la liste des commandes food */
export interface FoodOrderFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  dateFrom?: string;
  dateTo?: string;
  status?: FoodOrderStatus | FoodOrderStatus[];
  restaurantId?: string;
}

/** Filtres pour la liste des restaurants */
export interface RestaurantFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  cityId?: string;
  category?: string;
  isActive?: boolean;
  search?: string;
}

@Injectable()
export class FoodService {
  constructor(
    @InjectRepository(FoodOrder)
    private readonly orderRepo: Repository<FoodOrder>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    private readonly eventBus: EventBusService,
  ) {}

  async getRestaurants(params: RestaurantFilterParams = {}): Promise<PaginatedResult<Restaurant>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'rating',
      sortOrder = 'DESC',
      cityId,
      category,
      isActive = true,
      search,
    } = params;

    const ALLOWED_SORT = ['rating', 'name', 'createdAt'];
    const safeSort = ALLOWED_SORT.includes(sortBy) ? sortBy : 'rating';

    const qb = this.restaurantRepo.createQueryBuilder('r');

    // ─── Filtres standards ─────────────────────────────────────────────────
    if (typeof isActive === 'boolean') qb.andWhere('r.isActive = :isActive', { isActive });
    if (cityId) qb.andWhere('r.cityId = :cityId', { cityId });

    // ─── Filtres avancés ──────────────────────────────────────────────────
    if (category) qb.andWhere('r.category ILIKE :category', { category: `%${category}%` });
    if (search)   qb.andWhere('r.name ILIKE :search', { search: `%${search}%` });

    const { page: p, limit: l } = PaginationHelper.normalize({ page, limit });
    const [data, total] = await qb
      .orderBy(`r.${safeSort}`, sortOrder)
      .skip(PaginationHelper.toOffset(p, l))
      .take(l)
      .getManyAndCount();

    return PaginationHelper.build(data, total, { page: p, limit: l });
  }

  async placeOrder(userId: string, cityId: string, data: Partial<FoodOrder>): Promise<FoodOrder> {
    const order = await this.orderRepo.save(
      this.orderRepo.create({ ...data, userId, status: FoodOrderStatus.PENDING }),
    );

    await this.eventBus.emit(DomainEvents.FOOD_ORDER_PLACED, {
      version: 1,
      orderId: order.id,
      userId,
      restaurantId: order.restaurantId,
      total: order.total,
      cityId,
      timestamp: new Date(),
    });

    return order;
  }

  async getOrders(
    userId: string,
    params: FoodOrderFilterParams = {},
  ): Promise<PaginatedResult<FoodOrder>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      dateFrom,
      dateTo,
      status,
      restaurantId,
    } = params;

    const ALLOWED_SORT = ['createdAt', 'total', 'updatedAt'];
    const safeSort = ALLOWED_SORT.includes(sortBy) ? sortBy : 'createdAt';

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.userId = :userId', { userId });

    // ─── Filtres standards ─────────────────────────────────────────────────
    if (dateFrom) qb.andWhere('o.createdAt >= :dateFrom', { dateFrom });
    if (dateTo)   qb.andWhere('o.createdAt <= :dateTo',   { dateTo });

    // ─── Filtres avancés ──────────────────────────────────────────────────
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      qb.andWhere('o.status IN (:...statuses)', { statuses });
    }
    if (restaurantId) qb.andWhere('o.restaurantId = :restaurantId', { restaurantId });

    const { page: p, limit: l } = PaginationHelper.normalize({ page, limit });
    const [data, total] = await qb
      .orderBy(`o.${safeSort}`, sortOrder)
      .skip(PaginationHelper.toOffset(p, l))
      .take(l)
      .getManyAndCount();

    return PaginationHelper.build(data, total, { page: p, limit: l });
  }
}
