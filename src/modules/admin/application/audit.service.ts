import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindManyOptions, Repository } from 'typeorm';
import { AuditLog, AuditOutcome } from '../domain/entities/audit-log.entity';

export interface AuditLogInput {
  userId?: string;
  activeRoles?: string[];
  action: string;
  resource: string;
  resourceId?: string;
  cityId?: string;
  outcome: AuditOutcome;
  denialReason?: string;
  ipAddress?: string;
  userAgent?: string;
  httpMethod?: string;
  requestPath?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogQueryFilters {
  userId?: string;
  outcome?: AuditOutcome;
  resource?: string;
  cityId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * Enregistre un événement d'audit.
   * Fire-and-forget : n'attend pas la résolution pour ne pas bloquer la requête.
   */
  log(input: AuditLogInput): void {
    this.persist(input).catch((err) =>
      this.logger.error('Audit log write failed', err),
    );
  }

  /**
   * Enregistre et attend la résolution (usage explicite quand la durabilité est critique).
   */
  async logAsync(input: AuditLogInput): Promise<AuditLog> {
    return this.persist(input);
  }

  private async persist(input: AuditLogInput): Promise<AuditLog> {
    const entry = this.auditRepo.create({
      userId: input.userId ?? null,
      activeRoles: input.activeRoles?.length ? input.activeRoles.join(',') : null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      cityId: input.cityId ?? null,
      outcome: input.outcome,
      denialReason: input.denialReason ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      httpMethod: input.httpMethod ?? null,
      requestPath: input.requestPath ?? null,
      metadata: input.metadata ?? null,
    });

    return this.auditRepo.save(entry);
  }

  /**
   * Requête paginée des logs d'audit pour le tableau de bord admin.
   */
  async query(filters: AuditLogQueryFilters): Promise<PaginatedAuditLogs> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where: FindManyOptions<AuditLog>['where'] = {};

    if (filters.userId)   Object.assign(where, { userId: filters.userId });
    if (filters.outcome)  Object.assign(where, { outcome: filters.outcome });
    if (filters.resource) Object.assign(where, { resource: filters.resource });
    if (filters.cityId)   Object.assign(where, { cityId: filters.cityId });
    if (filters.from && filters.to) {
      Object.assign(where, { createdAt: Between(filters.from, filters.to) });
    }

    const [data, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /** Statistiques agrégées par ressource/outcome (pour dashboard) */
  async getSummary(
    from: Date,
    to: Date,
    cityId?: string,
  ): Promise<{ resource: string; outcome: string; count: number }[]> {
    const qb = this.auditRepo
      .createQueryBuilder('al')
      .select('al.resource', 'resource')
      .addSelect('al.outcome', 'outcome')
      .addSelect('COUNT(*)', 'count')
      .where('al."createdAt" BETWEEN :from AND :to', { from, to })
      .groupBy('al.resource')
      .addGroupBy('al.outcome')
      .orderBy('count', 'DESC');

    if (cityId) qb.andWhere('al."cityId" = :cityId', { cityId });

    return qb.getRawMany<{ resource: string; outcome: string; count: number }>();
  }
}
