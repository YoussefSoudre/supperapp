import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  AnnouncementMediaType,
  AnnouncementScope,
  AnnouncementStatus,
  AnnouncementType,
} from '../../domain/entities/announcement.entity';

// ─── Création ────────────────────────────────────────────────────────────────

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Maintenance programmée ce soir', maxLength: 250 })
  @IsString()
  @MinLength(3)
  @MaxLength(250)
  title: string;

  @ApiProperty({
    example: "L'application sera indisponible de 23h00 à 00h00 pour maintenance.",
  })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiPropertyOptional({
    example: 'Indisponibilité 23h-00h ce soir.',
    maxLength: 100,
    description: 'Texte court pour la notification push (≤ 100 chars)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shortDescription?: string;

  @ApiPropertyOptional({ enum: AnnouncementType, default: AnnouncementType.INFO })
  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @ApiProperty({
    enum: AnnouncementScope,
    description: '`global` = toutes les villes · `city` = ville précise',
  })
  @IsEnum(AnnouncementScope)
  scope: AnnouncementScope;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Requis si scope = `city`',
  })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['user', 'driver'],
    description: 'Rôles ciblés. null ou absent = tous les utilisateurs',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['push', 'in_app', 'websocket'],
    description: 'Canaux de diffusion lors de la publication',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ example: 'https://app.superapp-bf.com/maintenance' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.superapp-bf.com/announcements/banner.jpg',
    description:
      'URL publique du média (image ou vidéo). ' +
      'Obtenue après upload via `POST /announcements/admin/media`.',
  })
  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @ApiPropertyOptional({
    enum: AnnouncementMediaType,
    description: '`image` (JPEG/PNG/WebP/GIF) ou `video` (MP4/WebM). Requis si `mediaUrl` est fourni.',
  })
  @IsOptional()
  @IsEnum(AnnouncementMediaType)
  mediaType?: AnnouncementMediaType;

  @ApiPropertyOptional({
    example: 'https://cdn.superapp-bf.com/announcements/banner-thumb.jpg',
    description: 'Thumbnail pour les vidéos (optionnel, généré automatiquement si absent).',
  })
  @IsOptional()
  @IsUrl()
  mediaThumbnailUrl?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: "Date d'expiration automatique ISO8601 (null = jamais)",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description:
      'Date de publication planifiée ISO8601. ' +
      'Si fournie, crée/garde le statut `scheduled` et publie automatiquement via le cron. ' +
      'null = publication immédiate lors du `publish`.',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

// ─── Modification ────────────────────────────────────────────────────────────

export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}

// ─── Filtre liste ─────────────────────────────────────────────────────────────

export class AnnouncementFilterDto {
  @ApiPropertyOptional({ enum: AnnouncementStatus })
  @IsOptional()
  @IsEnum(AnnouncementStatus)
  status?: AnnouncementStatus;

  @ApiPropertyOptional({ enum: AnnouncementScope })
  @IsOptional()
  @IsEnum(AnnouncementScope)
  scope?: AnnouncementScope;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({ enum: AnnouncementType })
  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  /**
   * Pagination cursor : UUID de la dernière annonce de la page précédente.
   * Si fourni, remplace page/skip par une pagination basée sur (publishedAt, id).
   */
  @ApiPropertyOptional({
    description: 'Cursor UUID de la dernière annonce reçue (pagination cursor-based)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  cursor?: string;
}

// ─── Mark As Read ─────────────────────────────────────────────────────────────

export class MarkReadDto {
  @ApiProperty({ format: 'uuid', description: "UUID de l'annonce lue" })
  @IsUUID()
  announcementId: string;
}

// ─── Estimation audience ──────────────────────────────────────────────────────

export class AudienceEstimateResponseDto {
  @ApiProperty({ description: 'Nombre estimé d\'utilisateurs ciblés' })
  estimatedUsers: number;

  @ApiProperty()
  scope: string;

  @ApiProperty({ nullable: true })
  cityId: string | null;

  @ApiProperty({ nullable: true })
  targetRoles: string[] | null;
}
