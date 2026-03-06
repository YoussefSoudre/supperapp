import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiNoContentResponse, ApiTags, ApiParam, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiHeader } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RbacService } from '../application/rbac.service';
import { AuditService } from '../application/audit.service';
import { RoleScope } from '../domain/entities/role.entity';
import { UserRole } from '../domain/entities/user-role.entity';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../shared/guards/permission.guard';
import { RequirePermission } from '../../../shared/decorators/require-permission.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import {
  AddPermissionsToRoleDto,
  AssignRoleDto,
  AuditLogQueryDto,
  CreatePermissionDto,
  CreateRoleDto,
  UpdateRoleDto,
} from './dto/rbac.dto';

@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller({ path: 'admin/rbac', version: '1' })
export class RbacController {
  constructor(
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  // ─── Bootstrap (premier super_admin) ────────────────────────────────────

  /**
   * Endpoint de bootstrap : assigne le rôle super_admin à un utilisateur.
   * Protégé par le header `x-bootstrap-secret` (valeur = BOOTSTRAP_SECRET dans .env).
   * Fonctionne uniquement s'il n'existe aucun super_admin actif en base.
   */
  @Public()
  @Post('bootstrap')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[Bootstrap] Assigner le premier super_admin',
    description:
      'Endpoint de bootstrap initial. Protégé par le header `x-bootstrap-secret`.\n\n' +
      'Ne fonctionne que si aucun super_admin actif n\'existe déjà en base.\n\n' +
      'Définir `BOOTSTRAP_SECRET` dans le fichier `.env` / `docker-compose.yml`.',
  })
  @ApiHeader({ name: 'x-bootstrap-secret', description: 'Clé secrète de bootstrap (BOOTSTRAP_SECRET env)', required: true })
  @ApiCreatedResponse({ schema: { example: { userId: 'uuid', roleId: 'uuid', cityId: null, grantedAt: '2026-01-01T00:00:00Z' } } })
  async bootstrapSuperAdmin(
    @Headers('x-bootstrap-secret') secret: string,
    @Body('userId') userId: string,
  ) {
    const expected = this.configService.get<string>('BOOTSTRAP_SECRET');
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid bootstrap secret');
    }

    // Vérifier qu'il n'existe pas déjà un super_admin actif
    const existing = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin('ur.role', 'r')
      .where('r.slug = :slug', { slug: 'super_admin' })
      .andWhere('ur.isActive = true')
      .getOne();

    if (existing) {
      throw new UnauthorizedException(
        'A super_admin already exists. Use the standard RBAC endpoint to assign roles.',
      );
    }

    const role = await this.rbacService.listRoles()
      .then((roles: any[]) => roles.find((r: any) => r.slug === 'super_admin'));

    if (!role) throw new UnauthorizedException('super_admin role not found. Run seed-rbac.sql first.');

    return this.rbacService.assignRole(userId, role.id, userId, { reason: 'Bootstrap initial super_admin' });
  }

  // ─── Rôles ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Lister tous les rôles actifs avec leurs permissions', description: 'Réquiert la permission `admin:roles`. Retourne tous les rôles système et custom avec leurs slugs de permissions associés.' })
  @ApiOkResponse({ schema: { example: { data: [{ id: 'uuid', name: 'city_admin', slug: 'city_admin', permissions: ['rides:read', 'users:read'] }] } } })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:roles')
  @Get('roles')
  listRoles() {
    return this.rbacService.listRoles();
  }

  @ApiOperation({ summary: 'Créer un nouveau rôle custom', description: 'Réquiert `admin:roles`. Les rôles système (`user`, `driver`, `super_admin`) ne peuvent pas être créés via cet endpoint.' })
  @ApiCreatedResponse({ schema: { example: { id: 'uuid', name: 'Modérateur', slug: 'moderateur', scope: 'city' } } })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:roles')
  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole({
      name: dto.name,
      slug: dto.slug,
      scope: dto.scope as RoleScope,
      description: dto.description,
      color: dto.color,
    });
  }

  @ApiOperation({ summary: 'Modifier un rôle (non-système)', description: 'Réquiert `admin:roles`. Les rôles système sont en lecture seule.' })
  @ApiParam({ name: 'id', description: 'UUID du rôle' })
  @ApiOkResponse({ description: 'Rôle mis à jour' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:roles')
  @Put('roles/:id')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, dto);
  }

  @ApiOperation({ summary: 'Supprimer un rôle (non-système)', description: 'Réquiert `admin:roles`. Retourne 204 si supprimé.' })
  @ApiParam({ name: 'id', description: 'UUID du rôle' })
  @ApiNoContentResponse({ description: 'Rôle supprimé' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:roles')
  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRole(@Param('id') id: string) {
    return this.rbacService.deleteRole(id);
  }

  // ─── Permissions d'un rôle ─────────────────────────────────────────────

  @ApiOperation({ summary: 'Assigner des permissions à un rôle', description: 'Réquiert `admin:permissions`. Passe un tableau de slugs de permissions (`["rides:read", "users:write"]`).' })
  @ApiParam({ name: 'id', description: 'UUID du rôle' })
  @ApiOkResponse({ description: 'Permissions assignées' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:permissions')
  @Post('roles/:id/permissions')
  addPermissionsToRole(
    @Param('id') roleId: string,
    @Body() dto: AddPermissionsToRoleDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as { id: string };
    return this.rbacService.addPermissionsToRole(roleId, dto.slugs, user.id);
  }

  @ApiOperation({ summary: 'Retirer une permission d\'un rôle', description: 'Réquiert `admin:permissions`. Retourne 204.' })
  @ApiParam({ name: 'roleId', description: 'UUID du rôle' })
  @ApiParam({ name: 'permissionId', description: 'UUID de la permission' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:permissions')
  @Delete('roles/:roleId/permissions/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePermissionFromRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rbacService.removePermissionFromRole(roleId, permissionId);
  }

  // ─── Permissions (catalogue) ───────────────────────────────────────────

  @ApiOperation({ summary: 'Lister toutes les permissions disponibles', description: 'Réquiert `admin:permissions`. Retourne le catalogue complet des permissions enregistrées dans le système.' })
  @ApiOkResponse({ schema: { example: { data: [{ id: 'uuid', slug: 'rides:read', description: 'Lire les courses' }] } } })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:permissions')
  @Get('permissions')
  listPermissions() {
    return this.rbacService.listPermissions();
  }

  @ApiOperation({ summary: 'Créer une nouvelle permission custom', description: 'Réquiert `admin:permissions`. Format slug recommandé : `resource:action` (ex: `deliveries:cancel`).' })
  @ApiCreatedResponse({ schema: { example: { id: 'uuid', slug: 'deliveries:cancel', description: 'Annuler des livraisons' } } })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:permissions')
  @Post('permissions')
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(dto);
  }

  // ─── Rôles d'un utilisateur ────────────────────────────────────────────

  @ApiOperation({ summary: 'Assigner un rôle à un utilisateur', description: 'Réquiert `admin:users_roles`. Supporte `cityId` et `expiresAt` pour les rôles limités dans le temps ou par ville.' })
  @ApiParam({ name: 'userId', description: 'UUID de l\'utilisateur' })
  @ApiCreatedResponse({ schema: { example: { userId: 'uuid', roleId: 'uuid', cityId: null, expiresAt: null, grantedAt: '2025-01-01T00:00:00Z' } } })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:users_roles')
  @Post('users/:userId/roles')
  assignRole(
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
    @Request() req: ExpressRequest,
  ) {
    const grantedBy = (req.user as { id: string }).id;
    return this.rbacService.assignRole(userId, dto.roleId, grantedBy, {
      cityId: dto.cityId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      reason: dto.reason,
    });
  }

  @ApiOperation({ summary: 'Révoquer un rôle d\'un utilisateur', description: 'Réquiert `admin:users_roles`. Retourne 204 si révoqué.' })
  @ApiParam({ name: 'userId', description: 'UUID de l\'utilisateur' })
  @ApiParam({ name: 'userRoleId', description: 'UUID de l\'assignation de rôle' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:users_roles')
  @Delete('users/:userId/roles/:userRoleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeRole(
    @Param('userRoleId') userRoleId: string,
    @Request() req: ExpressRequest,
  ) {
    const revokedBy = (req.user as { id: string }).id;
    return this.rbacService.revokeRole(userRoleId, revokedBy);
  }

  @ApiOperation({ summary: 'Rôles actifs d\'un utilisateur', description: 'Réquiert `admin:users_roles`. Inclut les rôles expirés si demandé.' })
  @ApiParam({ name: 'userId', description: 'UUID de l\'utilisateur' })
  @ApiOkResponse({ schema: { example: { data: [{ role: 'city_admin', cityId: 'uuid', grantedAt: '2025-01-01T00:00:00Z' }] } } })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:users_roles')
  @Get('users/:userId/roles')
  getUserRoles(@Param('userId') userId: string) {
    return this.rbacService.getUserRoles(userId);
  }

  @ApiOperation({ summary: 'Permissions effectives d\'un utilisateur', description: 'Réquiert `admin:users_roles`. Agrège toutes les permissions des rôles actifs de l\'utilisateur.' })
  @ApiParam({ name: 'userId', description: 'UUID de l\'utilisateur' })
  @ApiOkResponse({ schema: { example: { permissions: ['rides:read', 'users:read', 'admin:audit_logs'] } } })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:users_roles')
  @Get('users/:userId/permissions')
  getUserEffectivePermissions(@Param('userId') userId: string) {
    return this.rbacService.getUserEffectivePermissions(userId);
  }

  @ApiOperation({ summary: 'Mes permissions (utilisateur connecté)', description: 'Retourne la liste des slugs de permissions effectives pour l\'utilisateur authentifié. Utilisé par le frontend pour activer/désactiver les boutons d\'action.' })
  @ApiOkResponse({ schema: { example: { permissions: ['rides:read', 'wallet:topup'] } } })
  @ApiUnauthorizedResponse()
  @Get('me/permissions')
  getMyPermissions(@Request() req: ExpressRequest) {
    const user = req.user as { id: string };
    return this.rbacService.getUserEffectivePermissions(user.id);
  }

  // ─── Audit logs ────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Logs d\'audit paginés', description: 'Réquiert `admin:audit_logs`. Filtres : `userId`, `outcome` (success|failure), `resource`, `cityId`, `from`, `to`, `page`, `limit`.' })
  @ApiOkResponse({ schema: { example: { data: [], total: 500, page: 1, limit: 20 } } })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:audit_logs')
  @Get('audit-logs')
  getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.auditService.query({
      userId: query.userId,
      outcome: query.outcome,
      resource: query.resource,
      cityId: query.cityId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @ApiOperation({ summary: 'Résumé agrégé des logs d\'audit', description: 'Réquiert `admin:audit_logs`. Retourne des compteurs par ressource/action pour le dashboard d\'audit. Query params : `from`, `to` (ISO8601), `cityId` (optionnel).' })
  @ApiOkResponse({ schema: { example: { total: 1240, byAction: { login: 300, assign_role: 12 }, failureRate: 0.03, topResources: ['users', 'roles'] } } })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @RequirePermission('admin:audit_logs')
  @Get('audit-logs/summary')
  getAuditSummary(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('cityId') cityId?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 86400_000);
    const toDate = to ? new Date(to) : new Date();
    return this.auditService.getSummary(fromDate, toDate, cityId);
  }
}
