import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../domain/entities/role.entity';
import { Permission } from '../domain/entities/permission.entity';
import { UserRole } from '../domain/entities/user-role.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  async getRoles(): Promise<Role[]> {
    return this.roleRepo.find({ where: { isActive: true } });
  }

  async assignRole(
    userId: string,
    roleId: string,
    grantedBy: string,
    cityId?: string,
  ): Promise<UserRole> {
    const existing = await this.userRoleRepo.findOne({ where: { userId, roleId } });
    if (existing) return existing;

    return this.userRoleRepo.save(
      this.userRoleRepo.create({ userId, roleId, grantedBy, cityId: cityId ?? null, expiresAt: null }),
    );
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoinAndSelect('role', 'r', 'r.id = ur.roleId')
      .where('ur.userId = :userId', { userId })
      .andWhere('(ur.expiresAt IS NULL OR ur.expiresAt > NOW())')
      .getMany();

    return userRoles.map((ur) => ur.roleId);
  }
}
