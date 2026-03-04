import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../domain/entities/user.entity';
import { PaginatedResult } from '../../../shared/interfaces/repository.interface';

export interface UserFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  status?: UserStatus | UserStatus[];
  cityId?: string;
  phoneVerified?: boolean;
  kycVerified?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.repo.update(id, data as any);
    return this.findById(id);
  }

  async updateFcmToken(id: string, fcmToken: string): Promise<void> {
    await this.repo.update(id, { fcmToken });
  }

  /**
   * Liste paginée et filtrée des utilisateurs (usage admin).
   * passwordHash est exclu par la sélection TypeORM (select: false sur la colonne).
   */
  async findAll(params: UserFilterParams = {}): Promise<PaginatedResult<User>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      dateFrom,
      dateTo,
      search,
      status,
      cityId,
      phoneVerified,
      kycVerified,
    } = params;

    const ALLOWED_SORT = ['createdAt', 'firstName', 'lastName', 'updatedAt'];
    const safeSort = ALLOWED_SORT.includes(sortBy) ? sortBy : 'createdAt';

    const qb = this.repo.createQueryBuilder('u');

    // ─── Filtres standards ─────────────────────────────────────────────────
    if (dateFrom) qb.andWhere('u.createdAt >= :dateFrom', { dateFrom });
    if (dateTo)   qb.andWhere('u.createdAt <= :dateTo',   { dateTo });
    if (search) {
      qb.andWhere(
        '(u.firstName ILIKE :s OR u.lastName ILIKE :s OR u.email ILIKE :s OR u.phone ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    // ─── Filtres avancés ──────────────────────────────────────────────────
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      qb.andWhere('u.status IN (:...statuses)', { statuses });
    }
    if (cityId)                       qb.andWhere('u.cityId = :cityId', { cityId });
    if (phoneVerified !== undefined)  qb.andWhere('u.phoneVerified = :phoneVerified', { phoneVerified });
    if (kycVerified   !== undefined)  qb.andWhere('u.kycVerified = :kycVerified',     { kycVerified });

    const skip = (page - 1) * limit;
    const [data, total] = await qb
      .orderBy(`u.${safeSort}`, sortOrder)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
