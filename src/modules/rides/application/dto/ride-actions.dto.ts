import {
  IsEnum, IsOptional, IsString, IsNumber, Min, Max, IsInt, IsLatitude, IsLongitude,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RideStatus } from '../../domain/entities/ride.entity';

export class CancelRideDto {
  @ApiPropertyOptional({
    example: 'Chauffeur trop loin, j\'ai trouvé une alternative',
    description: 'Raison de l\'annulation (optionnelle)',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RateRideDto {
  @ApiProperty({
    minimum: 1,
    maximum: 5,
    example: 4,
    description: 'Note entière de 1 (très mauvais) à 5 (excellent)',
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    example: 'Chauffeur ponctuel et courtois',
    description: 'Commentaire libre sur la course ou le chauffeur',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class ModifyRideDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dropoffAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  dropoffLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  dropoffLng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
