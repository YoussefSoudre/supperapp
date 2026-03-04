import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RoleScope } from '../../domain/entities/role.entity';
import { AuditOutcome } from '../../domain/entities/audit-log.entity';

// ─── Role DTOs ────────────────────────────────────────────────────────────────

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  slug: string;

  @IsEnum(RoleScope)
  scope: RoleScope;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  color?: string;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  color?: string;
}

// ─── RolePermission DTOs ──────────────────────────────────────────────────────

export class AddPermissionsToRoleDto {
  @IsArray()
  @IsString({ each: true })
  slugs: string[];
}

// ─── UserRole DTOs ────────────────────────────────────────────────────────────

export class AssignRoleDto {
  @IsUUID()
  roleId: string;

  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

// ─── Audit Log DTOs ───────────────────────────────────────────────────────────

export class AuditLogQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(AuditOutcome)
  outcome?: AuditOutcome;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

// ─── Permission DTOs ──────────────────────────────────────────────────────────

export class CreatePermissionDto {
  @IsString()
  slug: string;

  @IsString()
  resource: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
