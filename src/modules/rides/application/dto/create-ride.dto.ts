import {
  IsEnum, IsNumber, IsOptional, IsString,
  IsUUID, IsDateString, Min, Max, IsLatitude, IsLongitude,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RideType } from '../../domain/entities/ride.entity';

export class CreateRideDto {
  @ApiProperty({ enum: RideType, example: RideType.MOTO })
  @IsEnum(RideType)
  type: RideType;

  @ApiProperty({ example: 'Rond-Point CAN, Ouagadougou' })
  @IsString()
  pickupAddress: string;

  @ApiProperty({ example: 12.3547 })
  @IsLatitude()
  pickupLat: number;

  @ApiProperty({ example: -1.5256 })
  @IsLongitude()
  pickupLng: number;

  @ApiProperty({ example: 'Hôpital Yalgado, Ouagadougou' })
  @IsString()
  dropoffAddress: string;

  @ApiProperty({ example: 12.3648 })
  @IsLatitude()
  dropoffLat: number;

  @ApiProperty({ example: -1.5312 })
  @IsLongitude()
  dropoffLng: number;

  @ApiPropertyOptional({
    example: '2026-03-15T08:00:00Z',
    description: 'ISO 8601 — déclenche une course planifiée (status: `scheduled`). Absent = course immédiate.',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    example: 'uuid-promo-code',
    description: 'UUID du code promo à appliquer sur le tarif',
  })
  @IsOptional()
  @IsUUID()
  promoCode?: string;
}
