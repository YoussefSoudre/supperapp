import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './domain/entities/role.entity';
import { Permission } from './domain/entities/permission.entity';
import { UserRole } from './domain/entities/user-role.entity';
import { RolePermission } from './domain/entities/role-permission.entity';
import { AuditLog } from './domain/entities/audit-log.entity';
import { User } from '../users/domain/entities/user.entity';
import { AdminController } from './presentation/admin.controller';
import { RbacController } from './presentation/rbac.controller';
import { AdminAuthController } from './presentation/admin-auth.controller';
import { AdminService } from './application/admin.service';
import { RbacService } from './application/rbac.service';
import { AuditService } from './application/audit.service';
import { AdminAuthService } from './application/admin-auth.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';

/**
 * AdminModule — Web Admin: gestion plateforme complète.
 * - Gestion utilisateurs/chauffeurs
 * - RBAC dynamique (rôles, permissions, audit)
 * - Configuration pricing et paiements
 * - Supervision des courses, paiements, litiges
 * - Analytics et KPIs
 * - Gestion des villes et zones
 *
 * Exports: RbacService (utilisé par PermissionGuard / CityScopeGuard via APP_GUARD)
 *          AuditService (utilisé par PermissionGuard)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission, UserRole, RolePermission, AuditLog, User]),
    NotificationsModule,
    AuthModule,
    RedisModule,
  ],
  controllers: [AdminController, RbacController, AdminAuthController],
  providers: [AdminService, RbacService, AuditService, AdminAuthService],
  exports: [AdminService, RbacService, AuditService],
})
export class AdminModule {}
