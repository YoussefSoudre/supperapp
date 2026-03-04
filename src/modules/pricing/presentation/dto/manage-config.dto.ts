import {
  IsEnum, IsString, IsBoolean, IsNumber, IsOptional,
  IsInt, Min, Max, ValidateNested, IsObject, IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PricingServiceType } from '../../domain/entities/pricing-rule.entity';
import { RuleKey } from '../../domain/constants/rule-keys.constants';

export class UpsertCityPricingConfigDto {
  @ApiProperty()
  @IsUUID()
  cityId: string;

  @ApiProperty({ enum: PricingServiceType })
  @IsEnum(PricingServiceType)
  serviceType: PricingServiceType;

  @ApiProperty({
    description: 'Clé de la règle (ex: base_fare, surge, dynamic_surge, carpool_discount…)',
    example: 'base_fare',
  })
  @IsString()
  ruleKey: RuleKey | string;

  @ApiProperty({ example: 'Tarif de base Ouagadougou' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Paramètres JSON propres à la règle',
    example: { amount: 500, currency: 'XOF', minimumFare: 700 },
  })
  @IsObject()
  params: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Conditions d\'activation (horaire, jours, passagers…)',
    example: { time: { start: '22:00', end: '06:00' }, days: [5, 6, 7] },
  })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 10, description: 'Ordre d\'exécution (ASC = premier)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ToggleRuleDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
