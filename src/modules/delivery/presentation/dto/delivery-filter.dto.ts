import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BaseFilterDto } from '../../../../shared/dto/base-filter.dto';
import { DeliveryStatus, PackageSize } from '../../domain/entities/delivery.entity';

/**
 * DeliveryFilterDto — Filtres pour GET /delivery
 *
 * Standard  : page, limit, sortBy (createdAt|price), sortOrder, dateFrom, dateTo
 * Avancés   : status, packageSize
 */
export class DeliveryFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    enum: DeliveryStatus,
    isArray: true,
    description: 'Filtrer par statut(s)',
    example: ['delivered', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(DeliveryStatus, { each: true })
  status?: DeliveryStatus | DeliveryStatus[];

  @ApiPropertyOptional({
    enum: PackageSize,
    isArray: true,
    description: 'Filtrer par taille de colis',
    example: ['small', 'medium'],
  })
  @IsOptional()
  @IsEnum(PackageSize, { each: true })
  packageSize?: PackageSize | PackageSize[];
}
