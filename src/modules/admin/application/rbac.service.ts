import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { Role, RoleScope } from '../domain/entities/role.entity';
import { Permission } from '../domain/entities/permission.entity';
import { UserRole } from '../domain/entities/user-role.entity';
import { RolePermission } from '../domain/entities/role-permission.entity';
import { PermissionSlug } from '../domain/constants/permissions.constants';

// TTL du cache Redis pour les permissions effectives d'un user
const CACHE_TTL_SEC = 300; // 5 minutes
const CACHE_PREFIX = 'rbac:perms:';

export interface EffectivePermissions {
  /** Ensemble des slugs accordés à l'utilisateur */
  slugs: Set<string>;
  /** CityIds pour lesquels cet utilisateur a des rôles CITY-scopés */
  cityScopedRoleIds: string[];
  /** True si l'user a un rôle GLOBAL (ex: super_admin) */
  hasGlobalRole: boolean;
  /** Slugs des rôles actifs */
  roleSlugSet: Set<string>;
}

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    @InjectRepository(RolePermission)
    private readonly rolePermRepo: Repository<RolePermission>,

    private readonly redis: RedisService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // CACHE & PERMISSIONS EFFECTIVES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Charge les permissions effectives d'un utilisateur depuis Redis ou DB.
   * La clé Redis est invalidée lors d'un changement de rôle/permission.
   */
  async getEffectivePermissions(userId: string): Promise<EffectivePermissions> {
    const cacheKey = `${CACHE_PREFIX}${userId}`;

    // 1. Essai lecture cache Redis
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as {
        slugs: string[];
        cityScopedRoleIds: string[];
        hasGlobalRole: boolean;
        roleSlugSet: string[];
      };
      return {
        slugs: new Set(parsed.slugs),
        cityScopedRoleIds: parsed.cityScopedRoleIds,
        hasGlobalRole: parsed.hasGlobalRole,
        roleSlugSet: new Set(parsed.roleSlugSet),
      };
    }

    // 2. Chargement depuis DB
    const effectivePermissions = await this.loadFromDb(userId);

    // 3. Mise en cache
    await this.redis.set(
      cacheKey,
      JSON.stringify({
        slugs: [...effectivePermissions.slugs],
        cityScopedRoleIds: effectivePermissions.cityScopedRoleIds,
        hasGlobalRole: effectivePermissions.hasGlobalRole,
        roleSlugSet: [...effectivePermissions.roleSlugSet],
      }),
      CACHE_TTL_SEC,
    );

    return effectivePermissions;
  }

  private async loadFromDb(userId: string): Promise<EffectivePermissions> {
    const now = new Date();

    // Charger les user_roles actifs et non expirés, avec leurs permissions
    const userRoles = await this.userRoleRepo.find({
      where: { userId, isActive: true },
      relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
    });

    const activeUserRoles = userRoles.filter(
      (ur) => !ur.expiresAt || ur.expiresAt > now,
    );

    const slugs = new Set<string>();
    const cityScopedRoleIds: string[] = [];
    const roleSlugSet = new Set<string>();
    let hasGlobalRole = false;

    for (const ur of activeUserRoles) {
      if (!ur.role?.isActive) continue;

      roleSlugSet.add(ur.role.slug);

      if (ur.role.scope === RoleScope.GLOBAL) {
        hasGlobalRole = true;
      } else if (ur.cityId) {
        cityScopedRoleIds.push(ur.cityId);
      }

      // Collecter les slugs des permissions
      for (const rp of ur.role.rolePermissions ?? []) {
        if (rp.permission?.isActive) {
          slugs.add(rp.permission.slug);
        }
      }
    }

    return { slugs, cityScopedRoleIds, hasGlobalRole, roleSlugSet };
  }

  /**
   * Vérifie si un utilisateur possède une permission donnée.
   * Si la permission est city-scopée, vérifie que l'user a un rôle dans cette ville.
   *
   * @param userId
   * @param slug     ex: 'rides:manage'
   * @param cityId   optionnel — requis pour les routes city-scopées
   */
  async hasPermission(
    userId: string,
    slug: string,
    cityId?: string,
  ): Promise<boolean> {
    const perms = await this.getEffectivePermissions(userId);

    if (!perms.slugs.has(slug)) return false;

    // Rôle global → accès sans restriction de ville
    if (perms.hasGlobalRole) return true;

    // Rôle city-scopé : la ville demandée doit être dans les villes de l'user
    if (cityId) {
      return perms.cityScopedRoleIds.includes(cityId);
    }

    return true;
  }

  /** Invalide le cache d'un user (à appeler après mutation de rôle) */
  async invalidateCache(userId: string): Promise<void> {
    await this.redis.del(`${CACHE_PREFIX}${userId}`);
    this.logger.debug(`RBAC cache invalidated for user ${userId}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CRUD ROLES
  // ─────────────────────────────────────────────────────────────────────────

  async createRole(data: {
    name: string;
    slug: string;
    scope: RoleScope;
    description?: string;
    color?: string;
  }): Promise<Role> {
    const existing = await this.roleRepo.findOne({ where: { slug: data.slug } });
    if (existing) throw new BadRequestException(`Le rôle "${data.slug}" existe déjà.`);

    const role = this.roleRepo.create({ ...data, isSystem: false, isActive: true });
    return this.roleRepo.save(role);
  }

  async updateRole(
    id: string,
    data: Partial<Pick<Role, 'name' | 'description' | 'color' | 'isActive'>>,
  ): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException(`Rôle introuvable: ${id}`);
    if (role.isSystem) throw new BadRequestException('Les rôles système ne sont pas modifiables.');

    Object.assign(role, data);
    return this.roleRepo.save(role);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException(`Rôle introuvable: ${id}`);
    if (role.isSystem) throw new BadRequestException('Les rôles système ne peuvent pas être supprimés.');

    await this.roleRepo.remove(role);
  }

  async listRoles(): Promise<Role[]> {
    return this.roleRepo.find({
      where: { isActive: true },
      relations: ['rolePermissions', 'rolePermissions.permission'],
      order: { name: 'ASC' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PERMISSIONS D'UN ROLE
  // ─────────────────────────────────────────────────────────────────────────

  async addPermissionsToRole(
    roleId: string,
    permissionSlugs: string[],
    grantedBy: string,
  ): Promise<RolePermission[]> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException(`Rôle introuvable: ${roleId}`);

    const permissions = await this.permRepo.find({
      where: { slug: In(permissionSlugs), isActive: true },
    });

    const notFound = permissionSlugs.filter(
      (slug) => !permissions.find((p) => p.slug === slug),
    );
    if (notFound.length > 0) {
      throw new BadRequestException(`Permissions introuvables: ${notFound.join(', ')}`);
    }

    const toCreate: RolePermission[] = [];
    for (const perm of permissions) {
      const exists = await this.rolePermRepo.findOne({
        where: { roleId, permissionId: perm.id },
      });
      if (!exists) {
        toCreate.push(
          this.rolePermRepo.create({ roleId, permissionId: perm.id, grantedBy }),
        );
      }
    }

    const saved = await this.rolePermRepo.save(toCreate);

    // Invalider le cache de tous les users qui ont ce rôle
    await this.invalidateCacheForRole(roleId);

    return saved;
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    const rp = await this.rolePermRepo.findOne({ where: { roleId, permissionId } });
    if (!rp) throw new NotFoundException('Permission non assignée à ce rôle.');

    await this.rolePermRepo.remove(rp);
    await this.invalidateCacheForRole(roleId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // USER ROLES
  // ─────────────────────────────────────────────────────────────────────────

  async assignRole(
    userId: string,
    roleId: string,
    grantedBy: string,
    options?: { cityId?: string; expiresAt?: Date; reason?: string },
  ): Promise<UserRole> {
    const role = await this.roleRepo.findOne({ where: { id: roleId, isActive: true } });
    if (!role) throw new NotFoundException(`Rôle introuvable: ${roleId}`);

    // Validation scope/ville
    if (role.scope === RoleScope.CITY && !options?.cityId) {
      throw new BadRequestException(`Ce rôle (scope=city) requiert un cityId.`);
    }
    if (role.scope === RoleScope.GLOBAL && options?.cityId) {
      throw new BadRequestException(`Ce rôle (scope=global) ne peut pas être limité à une ville.`);
    }

    const existing = await this.userRoleRepo.findOne({
      where: {
        userId,
        roleId,
        ...(options?.cityId ? { cityId: options.cityId } : {}),
        isActive: true,
      },
    });
    if (existing) return existing;

    const userRole = this.userRoleRepo.create({
      userId,
      roleId,
      cityId: options?.cityId ?? null,
      grantedBy,
      expiresAt: options?.expiresAt ?? null,
      reason: options?.reason ?? null,
      isActive: true,
    });

    const saved = await this.userRoleRepo.save(userRole);
    await this.invalidateCache(userId);
    return saved;
  }

  async revokeRole(userRoleId: string, revokedBy: string): Promise<void> {
    const ur = await this.userRoleRepo.findOne({ where: { id: userRoleId } });
    if (!ur) throw new NotFoundException(`UserRole introuvable: ${userRoleId}`);

    ur.isActive = false;
    ur.reason = `Révoqué par ${revokedBy}`;
    await this.userRoleRepo.save(ur);
    await this.invalidateCache(ur.userId);
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    return this.userRoleRepo.find({
      where: { userId, isActive: true },
      relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
    });
  }

  async getUserEffectivePermissions(
    userId: string,
  ): Promise<{ slugs: string[]; roles: string[]; hasGlobalRole: boolean }> {
    const eff = await this.getEffectivePermissions(userId);
    return {
      slugs: [...eff.slugs],
      roles: [...eff.roleSlugSet],
      hasGlobalRole: eff.hasGlobalRole,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PERMISSIONS CRUD
  // ─────────────────────────────────────────────────────────────────────────

  async listPermissions(): Promise<Permission[]> {
    return this.permRepo.find({ order: { resource: 'ASC', action: 'ASC' } });
  }

  async createPermission(data: {
    slug: PermissionSlug | string;
    resource: string;
    action: string;
    description?: string;
  }): Promise<Permission> {
    const existing = await this.permRepo.findOne({ where: { slug: data.slug } });
    if (existing) throw new BadRequestException(`Permission "${data.slug}" existe déjà.`);

    const perm = this.permRepo.create({ ...data, isActive: true });
    return this.permRepo.save(perm);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITAIRES PRIVÉS
  // ─────────────────────────────────────────────────────────────────────────

  private async invalidateCacheForRole(roleId: string): Promise<void> {
    // Trouver tous les users qui ont ce rôle et invalider leur cache
    const userRoles = await this.userRoleRepo.find({
      where: { roleId, isActive: true },
      select: ['userId'],
    });
    const uniqueUserIds = [...new Set(userRoles.map((ur) => ur.userId))];
    await Promise.all(uniqueUserIds.map((uid) => this.invalidateCache(uid)));
    this.logger.debug(`RBAC cache invalidated for ${uniqueUserIds.length} users (role ${roleId})`);
  }
}
