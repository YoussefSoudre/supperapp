import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseFilterDto } from '../../../../shared/dto/base-filter.dto';
import { UserStatus } from '../../domain/entities/user.entity';

/**
 * UserFilterDto — Filtres pour GET /users (admin)
 *
 * Standard  : page, limit, sortBy (createdAt|firstName|lastName), sortOrder,
 *             dateFrom, dateTo, search (prénom, nom, email, téléphone)
 * Avancés   : status, cityId, phoneVerified, kycVerified
 */
export class UserFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    enum: UserStatus,
    isArray: true,
    description: 'Filtrer par statut(s)',
    example: ['active', 'suspended'],
  })
  @IsOptional()
  @IsEnum(UserStatus, { each: true })
  status?: UserStatus | UserStatus[];

  @ApiPropertyOptional({ description: 'Filtrer par ville' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({ description: 'Filtrer par vérification téléphone' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  phoneVerified?: boolean;

  @ApiPropertyOptional({ description: 'Filtrer par vérification KYC' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  kycVerified?: boolean;
}
