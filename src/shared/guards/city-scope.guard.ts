import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RbacService } from '../../modules/admin/application/rbac.service';
import { IS_CITY_SCOPED_KEY } from '../decorators/city-scope.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * CityScopeGuard — Vérifie que l'utilisateur est autorisé à opérer sur la ville demandée.
 *
 * S'applique uniquement aux routes décorées avec @CityScoped().
 *
 * Logique :
 *  1. Si l'user a un rôle GLOBAL (super_admin, finance, analyste) → accès libre.
 *  2. Sinon, le cityId de la route (params.cityId || body.cityId) doit faire partie
 *     des villes pour lesquelles l'user a un rôle CITY actif.
 *
 * Utilisation :
 *   @RequirePermission('rides:manage')
 *   @CityScoped()
 *   @Get('/cities/:cityId/rides')
 */
@Injectable()
export class CityScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isCityScoped = this.reflector.getAllAndOverride<boolean>(IS_CITY_SCOPED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isCityScoped) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as { id: string } | undefined;
    if (!user?.id) return true; // JwtAuthGuard gère l'absence d'auth

    const perms = await this.rbacService.getEffectivePermissions(user.id);

    // Rôle global → pas de restriction de ville
    if (perms.hasGlobalRole) return true;

    // Déterminer le cityId cible depuis la route ou le body
    const targetCityId: string | undefined =
      (req.params as Record<string, string>).cityId ??
      (req.body as Record<string, string>)?.cityId;

    if (!targetCityId) {
      throw new ForbiddenException('cityId requis pour accéder à cette ressource.');
    }

    const allowed = perms.cityScopedRoleIds.includes(targetCityId);
    if (!allowed) {
      throw new ForbiddenException(
        `Accès refusé : vous n'avez pas de rôle actif pour la ville ${targetCityId}.`,
      );
    }

    return true;
  }
}
