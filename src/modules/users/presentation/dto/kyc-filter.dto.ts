import {
  IsEnum, IsOptional, IsUUID, IsDateString, IsString, Min, Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { UserKycStatus } from '../../domain/entities/user-kyc.entity';

export class KycFilterDto {
  @ApiPropertyOptional({
    enum: UserKycStatus,
    description: 'Filtrer par statut KYC',
    example: UserKycStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(UserKycStatus)
  status?: UserKycStatus;

  @ApiPropertyOptional({
    description: 'Filtrer par ville (UUID) — city_admin est automatiquement scopé à ses villes',
  })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({
    description: 'Recherche texte sur prénom, nom ou téléphone de l\'utilisateur',
    example: 'Kaboré',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Date de soumission minimale (ISO8601)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Date de soumission maximale (ISO8601)',
    example: '2026-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'UUID de l\'admin ayant traité le dossier (pour filtrer par relecteur)',
  })
  @IsOptional()
  @IsUUID()
  reviewedBy?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
