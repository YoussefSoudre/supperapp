import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RbacService } from '../../modules/admin/application/rbac.service';
import { AuditService } from '../../modules/admin/application/audit.service';
import { AuditOutcome } from '../../modules/admin/domain/entities/audit-log.entity';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * PermissionGuard — Vérifie que l'utilisateur authentifié possède au moins
 * une des permissions listées dans @RequirePermission().
 *
 * Ordre d'exécution attendu : JwtAuthGuard → PermissionGuard → CityScopeGuard
 *
 * Toutes les vérifications sont tracées dans audit_logs.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Routes publiques → pas de contrôle de permission
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredSlugs = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Pas de @RequirePermission → route accessible à tout utilisateur authentifié
    if (!requiredSlugs || requiredSlugs.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as { id: string; phone?: string; cityId?: string } | undefined;

    if (!user?.id) {
      this.audit(req, undefined, requiredSlugs[0], AuditOutcome.DENIED, 'Utilisateur non authentifié');
      throw new ForbiddenException('Authentification requise.');
    }

    // cityId = issu du JWT (ville de l'user) ou du paramètre de route
    const cityId: string | undefined =
      (req.params as Record<string, string>).cityId ??
      (req.body as Record<string, string>)?.cityId ??
      user.cityId;

    // Vérification : au moins un slug autorisé (OR logique)
    let allowed = false;
    let matchedSlug = '';
    for (const slug of requiredSlugs) {
      const ok = await this.rbacService.hasPermission(user.id, slug, cityId);
      if (ok) {
        allowed = true;
        matchedSlug = slug;
        break;
      }
    }

    // Récupérer les rôles actifs pour l'audit (lazy — seulement si besoin du log)
    const perms = await this.rbacService.getEffectivePermissions(user.id);
    const activeRoles = [...perms.roleSlugSet];

    if (!allowed) {
      const reason = `Permission requise: ${requiredSlugs.join(' | ')}`;
      this.audit(req, user.id, requiredSlugs[0], AuditOutcome.DENIED, reason, activeRoles, cityId);
      throw new ForbiddenException(reason);
    }

    this.audit(req, user.id, matchedSlug, AuditOutcome.ALLOWED, undefined, activeRoles, cityId);
    return true;
  }

  private audit(
    req: Request,
    userId: string | undefined,
    action: string,
    outcome: AuditOutcome,
    denialReason?: string,
    activeRoles?: string[],
    cityId?: string,
  ): void {
    const [resource] = action.split(':');
    this.auditService.log({
      userId,
      activeRoles: activeRoles ?? [],
      action,
      resource: resource ?? action,
      cityId,
      outcome,
      denialReason,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      httpMethod: req.method,
      requestPath: req.path,
    });
  }
}
