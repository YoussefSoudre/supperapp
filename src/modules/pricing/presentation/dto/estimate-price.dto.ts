import {
  IsEnum, IsNumber, IsOptional, Min, IsBoolean, IsUUID, IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PricingServiceType } from '../../domain/entities/pricing-rule.entity';

export class EstimatePriceDto {
  @ApiProperty({ enum: PricingServiceType })
  @IsEnum(PricingServiceType)
  serviceType: PricingServiceType;

  @ApiProperty({ example: 5.2 })
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @ApiProperty({ example: 18 })
  @IsNumber()
  @Min(0)
  durationMinutes: number;

  @ApiPropertyOptional({ example: 3, description: 'Nombre de passagers (covoiturage)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  passengersCount?: number;

  @ApiPropertyOptional({ example: 1.4, description: 'Facteur demande/offre (0–∞)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  demandFactor?: number;
}

export class CancellationFeeDto {
  @ApiProperty({ enum: PricingServiceType })
  @IsEnum(PricingServiceType)
  serviceType: PricingServiceType;
}
