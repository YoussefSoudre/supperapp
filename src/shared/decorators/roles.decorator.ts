import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/**
 * @Roles('admin', 'driver') — Contrôle d'accès RBAC dynamique
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
