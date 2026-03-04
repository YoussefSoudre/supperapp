import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * @RequirePermission('rides:manage')
 *
 * Posez ce décorateur sur un controller ou une route pour protéger l'accès.
 * Le PermissionGuard lit cette métadonnée et vérifie la permission dans le cache Redis.
 *
 * Exemples :
 *   @RequirePermission('rides:manage')          → un seul slug
 *   @RequirePermission('rides:read', 'rides:cancel') → OR logique (l'un ou l'autre suffit)
 */
export const RequirePermission = (...slugs: string[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, slugs);
