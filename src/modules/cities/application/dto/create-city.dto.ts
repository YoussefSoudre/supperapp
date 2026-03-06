import {
  IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum,
  MaxLength, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CityStatus }  from '../../domain/entities/city.entity';

export class CreateCityDto {
  @ApiProperty({ example: 'Kaya', description: 'Nom de la ville' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'kaya', description: 'Slug URL-friendly (unique)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({ example: 'BF', default: 'BF' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  countryCode?: string;

  @ApiPropertyOptional({ example: 'XOF', default: 'XOF' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ enum: CityStatus, default: CityStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CityStatus)
  status?: CityStatus;

  @ApiProperty({ example: 13.1, description: 'Latitude du centre-ville' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLat: number;

  @ApiProperty({ example: -1.08, description: 'Longitude du centre-ville' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLng: number;

  @ApiPropertyOptional({ example: 20, default: 30, description: 'Rayon opérationnel en km' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  radiusKm?: number;
}
