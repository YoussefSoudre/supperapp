import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseFilterDto } from '../../../../shared/dto/base-filter.dto';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from '../../domain/entities/notification.entity';

/**
 * NotificationFilterDto — Filtres pour GET /notifications
 *
 * Standard  : page, limit, sortBy (createdAt), sortOrder, dateFrom, dateTo
 * Avancés   : category, channel, priority, isRead
 */
export class NotificationFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    enum: NotificationCategory,
    description: 'Filtrer par catégorie',
  })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    description: 'Filtrer par canal d\'envoi',
  })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({
    enum: NotificationPriority,
    description: 'Filtrer par priorité',
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: '`true` = lues uniquement, `false` = non lues uniquement',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isRead?: boolean;
}
