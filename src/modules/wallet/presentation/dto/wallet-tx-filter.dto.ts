import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseFilterDto } from '../../../../shared/dto/base-filter.dto';
import { TransactionReason, TransactionType } from '../../domain/entities/wallet-transaction.entity';

/**
 * WalletTxFilterDto — Filtres pour GET /wallet/transactions
 *
 * Standard  : page, limit, sortBy (createdAt|amount), sortOrder, dateFrom, dateTo
 * Avancés   : type, reason, minAmount, maxAmount (en centimes)
 */
export class WalletTxFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    enum: TransactionType,
    description: 'Filtrer par type (credit / debit)',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({
    enum: TransactionReason,
    isArray: true,
    description: 'Filtrer par raison(s)',
    example: ['ride_payment', 'topup'],
  })
  @IsOptional()
  @IsEnum(TransactionReason, { each: true })
  reason?: TransactionReason | TransactionReason[];

  @ApiPropertyOptional({
    description: 'Montant minimum en centimes',
    example: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({
    description: 'Montant maximum en centimes',
    example: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAmount?: number;
}
