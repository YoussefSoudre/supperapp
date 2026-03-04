import { Injectable, Logger } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { ReferralProgram, ReferralServiceType } from '../domain/entities/referral-program.entity';
import { ReferralUsage, ReferralUsageStatus } from '../domain/entities/referral-usage.entity';
import { ReferralRewardLog, RewardLogStatus } from '../domain/entities/referral-reward-log.entity';
import {
  DomainEvents,
  UserRegisteredPayload,
  RideCompletedPayload,
  DeliveryCompletedPayload,
  FoodOrderDeliveredPayload,
} from '../../../shared/events/domain-events.constants';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { User } from '../../users/domain/entities/user.entity';
import { AntiAbuseService } from './anti-abuse.service';
import { ReferralRewardService } from './referral-reward.service';

export interface ReferralStats {
  referralCode:    string;
  totalFilleuls:   number;
  pending:         number;
  rewarded:        number;
  totalEarnedXof:  number;
  byService:       Record<string, number>;
}

export interface CityRoiStats {
  cityId:             string;
  programId:          string;
  totalRewardedUsages: number;
  totalCostXof:       number;
  byService:          Record<string, { count: number; costXof: number }>;
  generatedTrips:     number;
}

/**
 * ReferralService — Orchestrateur principal du système de parrainage.
 *
 * Flux complet :
 *
 *   1. USER_REGISTERED
 *      └─ Résout le parrain via referralCode → cherche dans users.referral_code
 *      └─ Sélectionne le programme actif (ville > global)
 *      └─ AntiAbuseService.check() → 6 contrôles parallèles
 *      └─ Crée ReferralUsage (PENDING)
 *      └─ Émet referral.applied
 *
 *   2. RIDE_COMPLETED / DELIVERY_COMPLETED / FOOD_ORDER_DELIVERED
 *      └─ Recherche l'usage PENDING du filleul
 *      └─ Vérifie que le service est éligible (serviceTypes)
 *      └─ Vérifie le montant minimum (minTriggerAmountXof)
 *      └─ Incrémente tripsCompleted
 *      └─ Si seuil atteint → ReferralRewardService.grant()
 *      └─ Émet notification push parrain + filleul
 */
@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectRepository(ReferralProgram)
    private readonly programRepo: Repository<ReferralProgram>,
    @InjectRepository(ReferralUsage)
    private readonly usageRepo: Repository<ReferralUsage>,
    @InjectRepository(ReferralRewardLog)
    private readonly logRepo: Repository<ReferralRewardLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly antiAbuse: AntiAbuseService,
    private readonly rewardService: ReferralRewardService,
    private readonly eventBus: EventBusService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // INSCRIPTION — user.registered
  // ══════════════════════════════════════════════════════════════════════════

  @OnEvent(DomainEvents.USER_REGISTERED)
  async onUserRegistered(payload: UserRegisteredPayload): Promise<void> {
    if (!payload.referralCode) return;

    this.logger.log(
      `Referral code '${payload.referralCode}' used at registration of user ${payload.userId}`,
    );

    try {
      // ── 1. Résoudre le parrain ───────────────────────────────────────────
      const referrer = await this.userRepo.findOne({
        where: { referralCode: payload.referralCode },
      });

      if (!referrer) {
        this.logger.warn(`Referral code '${payload.referralCode}' not found`);
        await this.eventBus.emit(DomainEvents.REFERRAL_ABUSE_DETECTED, {
          version: 1,
          suspectedUserId: payload.userId,
          referralCode:    payload.referralCode,
          reason:          'code_not_found',
          cityId:          payload.cityId,
          timestamp:       new Date(),
        });
        return;
      }

      // ── 2. Charger le programme actif (ville > global) ───────────────────
      const program = await this.findActiveProgram(payload.cityId);
      if (!program) {
        this.logger.warn(`No active referral program for city ${payload.cityId}`);
        return;
      }

      // ── 3. Vérifier qu'il n'existe pas déjà un usage pour ce filleul ─────
      const alreadyExists = await this.usageRepo.findOne({
        where: { refereeId: payload.userId },
      });
      if (alreadyExists) {
        this.logger.warn(`User ${payload.userId} already has a referral usage — skipping`);
        return;
      }

      // ── 4. Contrôles anti-abus ───────────────────────────────────────────
      const referee = await this.userRepo.findOneOrFail({ where: { id: payload.userId } });
      const abuseResult = await this.antiAbuse.check({
        referrerId:      referrer.id,
        refereeId:       payload.userId,
        refereePhone:    payload.phone,
        cityId:          payload.cityId,
        programId:       program.id,
        antiAbuseConfig: program.antiAbuseConfig,
      });

      if (abuseResult.abused) {
        await this.eventBus.emit(DomainEvents.REFERRAL_ABUSE_DETECTED, {
          version: 1,
          suspectedUserId: payload.userId,
          referralCode:    payload.referralCode,
          reason:          abuseResult.reasons.join(' | '),
          cityId:          payload.cityId,
          timestamp:       new Date(),
        });
        return;
      }

      // ── 5. Créer l'usage ─────────────────────────────────────────────────
      const expiryDays = program.antiAbuseConfig?.pendingExpiryDays ?? 90;
      const expiresAt  = new Date(Date.now() + expiryDays * 86400_000);

      const usage = this.usageRepo.create({
        programId:    program.id,
        cityId:       payload.cityId,
        referrerId:   referrer.id,
        refereeId:    payload.userId,
        status:       ReferralUsageStatus.PENDING,
        registrationIp: undefined, // enrichi par le guard HTTP si nécessaire
        phonePrefix:  payload.phone.replace(/\D/g, '').slice(0, 7),
        expiresAt,
      });

      await this.usageRepo.save(usage);

      // ── 6. Émettre referral.applied ──────────────────────────────────────
      await this.eventBus.emit(DomainEvents.REFERRAL_APPLIED, {
        version:       1,
        referralUsageId: usage.id,
        referrerId:    referrer.id,
        refereeId:     payload.userId,
        programId:     program.id,
        cityId:        payload.cityId,
        timestamp:     new Date(),
      });

      this.logger.log(
        `ReferralUsage created: ${usage.id} (${referrer.id} → ${payload.userId})`,
      );
    } catch (err) {
      this.logger.error(`onUserRegistered error: ${(err as Error).message}`, (err as Error).stack);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TRIP TERMINÉ — ride / delivery / food (handler générique)
  // ══════════════════════════════════════════════════════════════════════════

  @OnEvent(DomainEvents.RIDE_COMPLETED)
  async onRideCompleted(payload: RideCompletedPayload): Promise<void> {
    await this.handleTripCompleted({
      userId:      payload.userId,
      orderId:     payload.rideId,
      amountXof:   payload.amount,
      cityId:      payload.cityId,
      serviceType: 'ride',
    });
  }

  @OnEvent(DomainEvents.DELIVERY_COMPLETED)
  async onDeliveryCompleted(payload: DeliveryCompletedPayload): Promise<void> {
    await this.handleTripCompleted({
      userId:      payload.userId,
      orderId:     payload.deliveryId,
      amountXof:   payload.amount,
      cityId:      payload.cityId,
      serviceType: 'delivery',
    });
  }

  @OnEvent(DomainEvents.FOOD_ORDER_DELIVERED)
  async onFoodOrderDelivered(payload: FoodOrderDeliveredPayload): Promise<void> {
    await this.handleTripCompleted({
      userId:      payload.userId,
      orderId:     payload.orderId,
      amountXof:   payload.amount,
      cityId:      payload.cityId,
      serviceType: 'food',
    });
  }

  // ── Logique commune ───────────────────────────────────────────────────────

  private async handleTripCompleted(ctx: {
    userId:      string;
    orderId:     string;
    amountXof:   number;
    cityId:      string;
    serviceType: ReferralServiceType;
  }): Promise<void> {
    // Chercher un usage PENDING pour ce filleul
    const usage = await this.usageRepo.findOne({
      where: { refereeId: ctx.userId, status: ReferralUsageStatus.PENDING },
    });
    if (!usage) return;

    // Vérifier l'expiration
    if (usage.expiresAt && usage.expiresAt < new Date()) {
      await this.usageRepo.update(usage.id, { status: ReferralUsageStatus.EXPIRED });
      this.logger.warn(`ReferralUsage ${usage.id} expired`);
      return;
    }

    const program = await this.programRepo.findOne({ where: { id: usage.programId } });
    if (!program || !program.isActive) return;

    // Vérifier que le service est éligible
    if (!program.serviceTypes.includes(ctx.serviceType)) {
      this.logger.debug(
        `Service '${ctx.serviceType}' not eligible for program ${program.id} — skipping`,
      );
      return;
    }

    // Vérifier le montant minimum
    if (program.minTriggerAmountXof > 0 && ctx.amountXof < program.minTriggerAmountXof) {
      this.logger.debug(
        `Order amount ${ctx.amountXof} < minTriggerAmount ${program.minTriggerAmountXof} — not counting`,
      );
      return;
    }

    // Incrémenter le compteur de trips
    const newCount = usage.tripsCompleted + 1;
    await this.usageRepo.update(usage.id, { tripsCompleted: newCount });

    this.logger.log(
      `Referee ${ctx.userId} completed trip ${newCount}/${program.triggerAfterTrips} ` +
      `(usage ${usage.id}, service: ${ctx.serviceType})`,
    );

    // Seuil atteint → déclencher les récompenses
    if (newCount >= program.triggerAfterTrips) {
      await this.usageRepo.update(usage.id, { status: ReferralUsageStatus.COMPLETED });
      usage.tripsCompleted = newCount;

      await this.rewardService.grant({
        usage,
        program,
        triggerOrderId: ctx.orderId,
        serviceType:    ctx.serviceType,
        orderAmountXof: ctx.amountXof,
      });

      // Push notifications parrain + filleul
      await Promise.all([
        this.eventBus.emit(DomainEvents.NOTIFICATION_PUSH_REQUESTED, {
          version: 1,
          userId:  usage.referrerId,
          title:   '🎁 Bonus parrainage débloqué !',
          body:    `Votre filleul a complété ${newCount} course(s). Votre bonus est en route !`,
          channels: ['push'],
          timestamp: new Date(),
        }),
        this.eventBus.emit(DomainEvents.NOTIFICATION_PUSH_REQUESTED, {
          version: 1,
          userId:  usage.refereeId,
          title:   '🎉 Réduction parrainage disponible !',
          body:    'Votre récompense de bienvenue vient d\'être débloquée.',
          channels: ['push'],
          timestamp: new Date(),
        }),
      ]);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QUERY — Statistiques parrain
  // ══════════════════════════════════════════════════════════════════════════

  async getReferralStats(userId: string): Promise<ReferralStats> {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });

    const usages = await this.usageRepo.find({ where: { referrerId: userId } });

    const rewardedUsages = usages.filter(u => u.status === ReferralUsageStatus.REWARDED);

    // Logs de récompense pour ce parrain (rôle referrer)
    const logs = await this.logRepo
      .createQueryBuilder('log')
      .where('log.referrerId = :userId AND log.recipientRole = :role AND log.status = :status', {
        userId,
        role:   'referrer',
        status: RewardLogStatus.GRANTED,
      })
      .getMany();

    const totalEarned = logs.reduce((s, l) => s + Number(l.amountXof), 0);

    const byService: Record<string, number> = {};
    for (const log of logs) {
      byService[log.serviceType] = (byService[log.serviceType] ?? 0) + Number(log.amountXof);
    }

    return {
      referralCode:   user.referralCode,
      totalFilleuls:  usages.length,
      pending:        usages.filter(u => u.status === ReferralUsageStatus.PENDING).length,
      rewarded:       rewardedUsages.length,
      totalEarnedXof: totalEarned,
      byService,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QUERY — ROI par ville (admin)
  // ══════════════════════════════════════════════════════════════════════════

  async getCityRoi(cityId: string): Promise<CityRoiStats[]> {
    const logs = await this.logRepo
      .createQueryBuilder('log')
      .where('log.cityId = :cityId AND log.status = :status', {
        cityId,
        status: RewardLogStatus.GRANTED,
      })
      .getMany();

    // Grouper par programId
    const byProgram: Record<string, typeof logs> = {};
    for (const log of logs) {
      (byProgram[log.programId] ??= []).push(log);
    }

    return Object.entries(byProgram).map(([programId, pLogs]) => {
      const uniqueUsages = new Set(pLogs.map(l => l.referralUsageId)).size;
      const totalCost    = pLogs.reduce((s, l) => s + Number(l.amountXof), 0);

      const byService: Record<string, { count: number; costXof: number }> = {};
      for (const log of pLogs) {
        const svc = log.serviceType;
        byService[svc] ??= { count: 0, costXof: 0 };
        byService[svc].count++;
        byService[svc].costXof += Number(log.amountXof);
      }

      return {
        cityId,
        programId,
        totalRewardedUsages: uniqueUsages,
        totalCostXof:        totalCost,
        byService,
        generatedTrips:      pLogs.filter(l => l.recipientRole === 'referee').length,
      };
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Sélectionne le programme actif le plus spécifique.
   * Priorité : programme ville > programme global.
   */
  private async findActiveProgram(cityId: string): Promise<ReferralProgram | null> {
    const now = new Date();

    const cityProgram = await this.programRepo.findOne({
      where: { cityId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (cityProgram && (!cityProgram.expiresAt || cityProgram.expiresAt > now)) {
      return cityProgram;
    }

    const globalProgram = await this.programRepo.findOne({
      where: { cityId: IsNull() as any, isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (globalProgram && (!globalProgram.expiresAt || globalProgram.expiresAt > now)) {
      return globalProgram;
    }

    return null;
  }
}
