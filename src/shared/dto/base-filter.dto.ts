import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional, IsInt, Min, Max,
  IsDateString, IsString, IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * BaseFilterDto — Paramètres standards communs à toutes les listes.
 *
 * Filtres standards  : page, limit, sortBy, sortOrder
 * Filtres avancés    : dateFrom, dateTo, search (texte libre)
 *
 * Chaque module étend cette classe avec ses propres filtres métier.
 */
export class BaseFilterDto {
  // ─── Pagination ─────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ default: 1, description: 'Numéro de page (≥ 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Nombre d\'éléments par page (1-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // ─── Tri ────────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Champ de tri (selon le module)',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    description: 'Direction du tri',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  // ─── Plage de dates ─────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Date de début (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Date de fin (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  // ─── Recherche textuelle ─────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Recherche textuelle libre (ILIKE)',
    example: 'Ouagadougou',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
