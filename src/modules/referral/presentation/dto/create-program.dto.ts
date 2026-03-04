import {
  IsString, IsEnum, IsOptional, IsBoolean, IsNumber,
  IsInt, Min, IsUUID, IsArray, IsObject, MinLength, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType, ReferralServiceType } from '../../domain/entities/referral-program.entity';

export class CreateReferralProgramDto {
  @ApiProperty({ example: 'Programme Ouagadougou 2026' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'null = programme global', example: '<uuid>' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiProperty({
    description: 'Services éligibles',
    example: ['ride', 'food', 'delivery'],
    enum: ['ride', 'food', 'delivery'],
    isArray: true,
  })
  @IsArray()
  serviceTypes: ReferralServiceType[];

  @ApiProperty({ enum: RewardType })
  @IsEnum(RewardType)
  referrerRewardType: RewardType;

  @ApiProperty({ example: 1000, description: 'Centimes XOF (wallet_credit) ou taux×100 (discount)' })
  @IsInt()
  @Min(0)
  referrerRewardAmount: number;

  @ApiPropertyOptional({ example: 50, description: '0 = illimité' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxRewardsPerReferrer?: number;

  @ApiProperty({ enum: RewardType })
  @IsEnum(RewardType)
  refereeRewardType: RewardType;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(0)
  refereeRewardAmount: number;

  @ApiPropertyOptional({ example: 1, description: 'Trips requis avant déclenchement' })
  @IsOptional()
  @IsInt()
  @Min(1)
  triggerAfterTrips?: number;

  @ApiPropertyOptional({ example: 500, description: 'Montant minimum commande (centimes XOF, 0 = aucun)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minTriggerAmountXof?: number;

  @ApiPropertyOptional({
    description: 'Configuration anti-abus',
    example: {
      maxFilleulsPerReferrer: 50,
      minAccountAgeDays: 0,
      minTriggerAmountXof: 300,
      maxUsersPerSubnet: 5,
      blockSameDevice: true,
      pendingExpiryDays: 90,
    },
  })
  @IsOptional()
  @IsObject()
  antiAbuseConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Date d\'expiration ISO 8601' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ToggleProgramDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
