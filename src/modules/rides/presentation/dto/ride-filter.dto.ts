import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { BaseFilterDto } from '../../../../shared/dto/base-filter.dto';
import { RideStatus, RideType } from '../../domain/entities/ride.entity';

/**
 * RideFilterDto — Filtres pour GET /rides
 *
 * Standard  : page, limit, sortBy (createdAt|scheduledAt|price), sortOrder, dateFrom, dateTo
 * Avancés   : status, type, cityId (admin), driverId (admin)
 */
export class RideFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    enum: RideStatus,
    isArray: true,
    description: 'Filtrer par un ou plusieurs statuts',
    example: ['completed', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(RideStatus, { each: true })
  status?: RideStatus | RideStatus[];

  @ApiPropertyOptional({
    enum: RideType,
    isArray: true,
    description: 'Filtrer par type de véhicule',
    example: ['moto', 'car'],
  })
  @IsOptional()
  @IsEnum(RideType, { each: true })
  type?: RideType | RideType[];

  @ApiPropertyOptional({ description: 'Filtrer par ville (admin/driver)' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({ description: 'Filtrer par chauffeur (admin)' })
  @IsOptional()
  @IsUUID()
  driverId?: string;
}
