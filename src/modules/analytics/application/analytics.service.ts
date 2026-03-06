import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvents, RideCompletedPayload } from '../../../shared/events/domain-events.constants';
import { RbacService } from '../../admin/application/rbac.service';
import { Ride } from '../../rides/domain/entities/ride.entity';
import { Driver } from '../../drivers/domain/entities/driver.entity';
import { User } from '../../users/domain/entities/user.entity';
import { FoodOrder } from '../../food/domain/entities/food-order.entity';
import { Restaurant } from '../../food/domain/entities/restaurant.entity';
import { Delivery } from '../../delivery/domain/entities/delivery.entity';
import { Payment, PaymentStatus } from '../../payments/domain/entities/payment.entity';

/**
 * AnalyticsService — Statistiques en lecture seule avec scoping par ville.
 *
 * getCityMetrics  → city_admin / super_admin — stats 30 jours par ville
 * getManagerMetrics → manager / city_admin  — stats opérationnelles du jour
 * getGlobalMetrics  → super_admin           — stats globales toutes villes
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Ride)       private readonly rideRepo:       Repository<Ride>,
    @InjectRepository(Driver)     private readonly driverRepo:     Repository<Driver>,
    @InjectRepository(User)       private readonly userRepo:       Repository<User>,
    @InjectRepository(FoodOrder)  private readonly foodOrderRepo:  Repository<FoodOrder>,
    @InjectRepository(Restaurant) private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(Delivery)   private readonly deliveryRepo:   Repository<Delivery>,
    @InjectRepository(Payment)    private readonly paymentRepo:    Repository<Payment>,
    private readonly rbacService: RbacService,
  ) {}

  // ─── City Admin Metrics (30-day aggregated stats per city) ───────────────

  async getCityMetrics(userId: string, filterCityId?: string) {
    const cityIds = await this.resolveCityIds(userId, filterCityId);

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const since7d  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);

    const [rides, drivers, users, deliveries, food] = await Promise.all([
      this.getRideStats(cityIds, since30d),
      this.getDriverStats(cityIds),
      this.getUserStats(cityIds, since7d, since30d),
      this.getDeliveryStats(cityIds, since30d),
      this.getFoodStats(cityIds, since30d),
    ]);

    return {
      rides,
      drivers,
      users,
      deliveries,
      food,
      period: '30d',
      cityIds: cityIds ?? 'all',
    };
  }

  // ─── Manager Metrics (today/7d operational) ──────────────────────────────

  async getManagerMetrics(userId: string, filterCityId?: string) {
    const cityIds = await this.resolveCityIds(userId, filterCityId);
    if (!cityIds) {
      // super_admin with no filter → use all-city variant
      return this.getManagerMetricsForCities(null);
    }
    return this.getManagerMetricsForCities(cityIds);
  }

  private async getManagerMetricsForCities(cityIds: string[] | null) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const since7d          = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const onlineThreshold  = new Date(Date.now() - 15 * 60 * 1000); // 15 min

    const [ridesToday, rides7d, driversLive, deliveriesToday, foodToday] = await Promise.all([
      this.getRideStatsPeriod(cityIds, todayStart),
      this.getRideStatsPeriod(cityIds, since7d),
      this.getDriverLiveStats(cityIds, onlineThreshold),
      this.getDeliveryStatsPeriod(cityIds, todayStart),
      this.getFoodStatsPeriod(cityIds, todayStart),
    ]);

    return {
      ridesToday,
      rides7d,
      driversLive,
      deliveriesToday,
      foodToday,
      cityIds: cityIds ?? 'all',
    };
  }

  // ─── Global Metrics (super_admin, all cities) ─────────────────────────────

  async getGlobalMetrics() {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const since7d  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);

    const [rides, drivers, users, deliveries, food, payments] = await Promise.all([
      this.getRideStats(null, since30d),
      this.getDriverStats(null),
      this.getUserStats(null, since7d, since30d),
      this.getDeliveryStats(null, since30d),
      this.getFoodStats(null, since30d),
      this.getPaymentStats(since30d),
    ]);

    return { rides, drivers, users, deliveries, food, payments, period: '30d', scope: 'global' };
  }

  // ─── Scoping helper ──────────────────────────────────────────────────────

  /**
   * Returns null if the user is super_admin (unrestricted).
   * Returns an array of city UUIDs for city-scoped roles.
   * Throws ForbiddenException if filterCityId is outside the user's scope.
   */
  private async resolveCityIds(userId: string, filterCityId?: string): Promise<string[] | null> {
    const perms = await this.rbacService.getEffectivePermissions(userId);

    if (perms.hasGlobalRole) {
      return filterCityId ? [filterCityId] : null;
    }

    const managedCities = perms.cityScopedRoleIds;
    if (managedCities.length === 0) {
      throw new ForbiddenException('Aucune ville associée à votre compte.');
    }

    if (filterCityId) {
      if (!managedCities.includes(filterCityId)) {
        throw new ForbiddenException(`Accès refusé à la ville ${filterCityId}.`);
      }
      return [filterCityId];
    }

    return managedCities;
  }

  // ─── DB Query helpers ────────────────────────────────────────────────────

  private async getRideStats(cityIds: string[] | null, since: Date) {
    const qb = this.rideRepo.createQueryBuilder('r')
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE r.status = 'completed')`, 'completed')
      .addSelect(`COUNT(*) FILTER (WHERE r.status = 'cancelled')`, 'cancelled')
      .addSelect(
        `SUM(CASE WHEN r.status = 'completed' THEN CAST(r.final_price AS NUMERIC) ELSE 0 END)`,
        'revenue',
      )
      .where('r.created_at >= :since', { since });

    if (cityIds) qb.andWhere('r.city_id IN (:...cityIds)', { cityIds });

    const res = await qb.getRawOne();
    return {
      total:     +res.total     || 0,
      completed: +res.completed || 0,
      cancelled: +res.cancelled || 0,
      revenue:   +res.revenue   || 0,
    };
  }

  private async getDriverStats(cityIds: string[] | null) {
    const qb = this.driverRepo.createQueryBuilder('d')
      .select('d.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(CAST(d.rating AS NUMERIC))', 'avgRating')
      .groupBy('d.status');

    if (cityIds) qb.where('d.city_id IN (:...cityIds)', { cityIds });

    const rows = await qb.getRawMany();
    const byStatus: Record<string, number> = {};
    let avgRating = 0;
    rows.forEach(r => {
      byStatus[r.status] = +r.count;
      avgRating = +r.avgRating || 0;
    });

    return {
      byStatus,
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      avgRating: +avgRating.toFixed(2),
    };
  }

  private async getUserStats(cityIds: string[] | null, since7d: Date, since30d: Date) {
    const base = () => {
      const qb = this.userRepo.createQueryBuilder('u').where('u.deleted_at IS NULL');
      if (cityIds) qb.andWhere('u.city_id IN (:...cityIds)', { cityIds });
      return qb;
    };

    const [total, new7d, new30d, kycPending] = await Promise.all([
      base().getCount(),
      base().andWhere('u.created_at >= :since', { since: since7d }).getCount(),
      base().andWhere('u.created_at >= :since', { since: since30d }).getCount(),
      base().andWhere('u.kyc_verified = false').getCount(),
    ]);

    return { total, new7d, new30d, kycPending };
  }

  private async getDeliveryStats(cityIds: string[] | null, since: Date) {
    const qb = this.deliveryRepo.createQueryBuilder('d')
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE d.status = 'delivered')`, 'delivered')
      .addSelect(`COUNT(*) FILTER (WHERE d.status = 'cancelled')`, 'cancelled')
      .addSelect(
        `SUM(CASE WHEN d.status = 'delivered' THEN CAST(d.final_price AS NUMERIC) ELSE 0 END)`,
        'revenue',
      )
      .where('d.created_at >= :since', { since });

    if (cityIds) qb.andWhere('d.city_id IN (:...cityIds)', { cityIds });

    const res = await qb.getRawOne();
    return {
      total:     +res.total     || 0,
      delivered: +res.delivered || 0,
      cancelled: +res.cancelled || 0,
      revenue:   +res.revenue   || 0,
    };
  }

  private async getFoodStats(cityIds: string[] | null, since: Date) {
    const qb = this.foodOrderRepo.createQueryBuilder('fo')
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE fo.status = 'delivered')`, 'delivered')
      .addSelect(`COUNT(*) FILTER (WHERE fo.status = 'cancelled')`, 'cancelled')
      .addSelect(
        `SUM(CASE WHEN fo.status = 'delivered' THEN CAST(fo.total AS NUMERIC) ELSE 0 END)`,
        'revenue',
      )
      .innerJoin(Restaurant, 'r', 'r.id = fo.restaurant_id')
      .where('fo.created_at >= :since', { since });

    if (cityIds) qb.andWhere('r.city_id IN (:...cityIds)', { cityIds });

    const res = await qb.getRawOne();
    const total    = +res.total || 0;
    const revenue  = +res.revenue || 0;
    return {
      total,
      delivered: +res.delivered || 0,
      cancelled: +res.cancelled || 0,
      revenue,
      avgBasket: total > 0 ? Math.round(revenue / total) : 0,
    };
  }

  private async getPaymentStats(since: Date) {
    const qb = this.paymentRepo.createQueryBuilder('p')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CAST(p.amount AS NUMERIC))', 'volume')
      .addSelect(`COUNT(*) FILTER (WHERE p.status = '${PaymentStatus.FAILED}')`, 'failed')
      .where('p.created_at >= :since', { since });

    const res  = await qb.getRawOne();
    const total  = +res.total  || 0;
    const failed = +res.failed || 0;
    return {
      volume:      +res.volume || 0,
      total,
      failureRate: total > 0 ? +(failed / total).toFixed(4) : 0,
    };
  }

  // ─── Operational helpers (manager) ───────────────────────────────────────

  private async getRideStatsPeriod(cityIds: string[] | null, since: Date) {
    const qb = this.rideRepo.createQueryBuilder('r')
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE r.status = 'completed')`, 'completed')
      .addSelect(`COUNT(*) FILTER (WHERE r.status = 'cancelled')`, 'cancelled')
      .addSelect(
        `COUNT(*) FILTER (WHERE r.status IN ('pending','searching','accepted','driver_en_route','arrived','in_progress'))`,
        'active',
      )
      .where('r.created_at >= :since', { since });

    if (cityIds) qb.andWhere('r.city_id IN (:...cityIds)', { cityIds });

    const res = await qb.getRawOne();
    return {
      total:     +res.total     || 0,
      completed: +res.completed || 0,
      cancelled: +res.cancelled || 0,
      active:    +res.active    || 0,
    };
  }

  private async getDriverLiveStats(cityIds: string[] | null, onlineThreshold: Date) {
    const qb = this.driverRepo.createQueryBuilder('d')
      .select('d.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('d.status');

    if (cityIds) qb.where('d.city_id IN (:...cityIds)', { cityIds });

    const rows = await qb.getRawMany();
    const byStatus: Record<string, number> = {};
    rows.forEach(r => { byStatus[r.status] = +r.count; });

    const onlineQb = this.driverRepo.createQueryBuilder('d')
      .where(`d.status IN ('online', 'on_trip')`)
      .andWhere('d.last_seen_at >= :threshold', { threshold: onlineThreshold });

    if (cityIds) onlineQb.andWhere('d.city_id IN (:...cityIds)', { cityIds });

    const activeNow = await onlineQb.getCount();

    return {
      byStatus,
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      activeNow,
      pendingApproval: byStatus['pending_approval'] || 0,
    };
  }

  private async getDeliveryStatsPeriod(cityIds: string[] | null, since: Date) {
    const qb = this.deliveryRepo.createQueryBuilder('d')
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE d.status = 'delivered')`, 'delivered')
      .addSelect(`COUNT(*) FILTER (WHERE d.status IN ('pending', 'searching'))`, 'pending')
      .addSelect(`COUNT(*) FILTER (WHERE d.status IN ('accepted', 'picked_up', 'in_transit'))`, 'inProgress')
      .where('d.created_at >= :since', { since });

    if (cityIds) qb.andWhere('d.city_id IN (:...cityIds)', { cityIds });

    const res = await qb.getRawOne();
    return {
      total:      +res.total      || 0,
      delivered:  +res.delivered  || 0,
      pending:    +res.pending    || 0,
      inProgress: +res.inProgress || 0,
    };
  }

  private async getFoodStatsPeriod(cityIds: string[] | null, since: Date) {
    const qb = this.foodOrderRepo.createQueryBuilder('fo')
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE fo.status = 'delivered')`, 'delivered')
      .addSelect(`COUNT(*) FILTER (WHERE fo.status IN ('pending', 'confirmed'))`, 'pending')
      .addSelect(`COUNT(*) FILTER (WHERE fo.status IN ('preparing', 'ready_for_pickup', 'picked_up'))`, 'preparing')
      .innerJoin(Restaurant, 'r', 'r.id = fo.restaurant_id')
      .where('fo.created_at >= :since', { since });

    if (cityIds) qb.andWhere('r.city_id IN (:...cityIds)', { cityIds });

    const res = await qb.getRawOne();
    return {
      total:     +res.total     || 0,
      delivered: +res.delivered || 0,
      pending:   +res.pending   || 0,
      preparing: +res.preparing || 0,
    };
  }

  // ─── Event listener ───────────────────────────────────────────────────────

  @OnEvent(DomainEvents.RIDE_COMPLETED)
  onRideCompleted(payload: RideCompletedPayload): void {
    this.logger.debug(`Analytics: ride completed in city=${payload.cityId}`);
  }
}
