import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from '../../domain/entities/notification.entity';

// ─── Send a single notification ─────────────────────────────────────────────
export class SendNotificationDto {
  @ApiProperty({ description: "ID de l'utilisateur destinataire" })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ enum: NotificationCategory })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiPropertyOptional({ enum: NotificationPriority, default: NotificationPriority.NORMAL })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiProperty({ maxLength: 250 })
  @IsString()
  @MinLength(1)
  @MaxLength(250)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  body: string;

  @ApiPropertyOptional({ description: 'Deep-link data (ex: { rideId: "xxx" })' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Date ISO8601 de programmation' })
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Token FCM (canal push)' })
  @IsOptional()
  @IsString()
  deviceToken?: string;

  @ApiPropertyOptional({ description: 'Email destination (canal email)' })
  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @ApiPropertyOptional({ description: 'Téléphone E.164 (canal SMS)' })
  @IsOptional()
  @IsString()
  recipientPhone?: string;
}

// ─── Broadcast ──────────────────────────────────────────────────────────────
export class BroadcastNotificationDto {
  @ApiPropertyOptional({ description: 'Ville cible (null = toutes les villes)' })
  @IsOptional()
  @IsUUID()
  targetCityId?: string;

  @ApiPropertyOptional({ description: 'Rôle cible : driver | user | admin' })
  @IsOptional()
  @IsString()
  targetRole?: string;

  @ApiProperty({ maxLength: 250 })
  @IsString()
  @MinLength(1)
  @MaxLength(250)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  body: string;

  @ApiProperty({
    type: [String],
    enum: NotificationChannel,
    example: ['push', 'in_app'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @ApiProperty({ enum: NotificationCategory })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiPropertyOptional({ enum: NotificationPriority })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Filtres additionnels (ex: minCreatedDaysAgo)' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'ISO8601 — programme à une date future' })
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}
