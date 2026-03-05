import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../shared/guards/permission.guard';
import { RequirePermission } from '../../../shared/decorators/require-permission.decorator';
import { PERM_ANNOUNCEMENTS_MANAGE, PERM_ANNOUNCEMENTS_READ } from '../../admin/domain/constants/permissions.constants';
import { AnnouncementsService } from '../application/announcements.service';
import { MediaStorageService } from '../application/media-storage.service';
import {
  AnnouncementFilterDto,
  CreateAnnouncementDto,
  MarkReadDto,
  UpdateAnnouncementDto,
} from './dto/announcement.dto';

interface AuthRequest {
  user: { id: string; cityId: string; role: string };
}

/**
 * AnnouncementsController
 * ────────────────────────
 * Admin endpoints : CRUD + publication + archivage
 * User endpoints  : lecture des annonces actives dans leur ville
 */
@ApiTags('Announcements')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'announcements', version: '1' })
export class AnnouncementsController {
  constructor(
    private readonly service: AnnouncementsService,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILISATEURS — annonces actives
  // ═══════════════════════════════════════════════════════════════════════════

  @Get()
  @ApiOperation({
    summary: 'Annonces actives de ma ville (+ globales)',
    description:
      'Retourne toutes les annonces PUBLISHED visibles pour l\'utilisateur connecté :\n\n' +
      '- Annonces **globales** (toutes les villes)\n' +
      '- Annonces **spécifiques** à sa ville\n\n' +
      'Les annonces épinglées (`pinned = true`) apparaissent en premier.\n' +
      'Les annonces expirées (`expiresAt` dépassé) sont automatiquement exclues.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            title: 'Maintenance ce soir',
            content: '...',
            type: 'maintenance',
            scope: 'global',
            pinned: true,
            publishedAt: '2026-03-04T18:00:00Z',
          },
        ],
        total: 5,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    },
  })
  @ApiUnauthorizedResponse()
  getMyAnnouncements(
    @Request() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findActiveForCity(
      req.user.cityId,
      page  ? parseInt(page, 10)  : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'UUID de l\'annonce' })
  @ApiOperation({ summary: 'Détail d\'une annonce' })
  @ApiOkResponse({ description: 'Annonce trouvée' })
  @ApiNotFoundResponse({ description: 'Annonce introuvable' })
  @ApiUnauthorizedResponse()
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN — gestion complète
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Upload d'un média (image ou vidéo) pour une annonce.
   * Retourne l'URL publique + les métadonnées à réutiliser dans
   * `POST /announcements/admin` ou `PATCH /announcements/admin/:id`
   * via les champs `mediaUrl`, `mediaType`, `mediaThumbnailUrl`.
   */
  @Post('admin/media')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERM_ANNOUNCEMENTS_MANAGE)
  @UseInterceptors(
    FileInterceptor('file', {
      // Multer diskStorage : écrit le fichier dans /tmp pour permettre
      // à MediaStorageService de le déplacer vers le dossier final.
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'tmp'),
        filename: (_req, file, cb) =>
          cb(null, `${uuidv4()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: {
        fileSize: 200 * 1024 * 1024,  // 200 MB max (vidéo)
        files: 1,
      },
      fileFilter: (_req, file, cb) => {
        const allowed = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/;
        if (!allowed.test(file.mimetype)) {
          return cb(
            new Error(
              `Type de fichier non supporté: ${file.mimetype}. ` +
              `Acceptés: images (JPEG/PNG/WebP/GIF) et vidéos (MP4/WebM/MOV).`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: '[Admin] Uploader un média pour une annonce',
    description:
      'Uploade une **image** (JPEG, PNG, WebP, GIF — max 10 MB) ou une ' +
      '**vidéo** (MP4, WebM, MOV — max 200 MB).\n\n' +
      'Retourne :\n' +
      '- `url` : URL publique à stocker dans `mediaUrl`\n' +
      '- `mediaType` : `image` ou `video`\n' +
      '- `originalName`, `sizeBytes`, `mimeType` : métadonnées\n\n' +
      '**Workflow** :\n' +
      '1. `POST /announcements/admin/media` → récupère `url` + `mediaType`\n' +
      '2. `POST /announcements/admin` avec `mediaUrl` + `mediaType`\n' +
      '3. `POST /announcements/admin/:id/publish` → diffusion',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image (JPEG/PNG/WebP/GIF ≤ 10 MB) ou vidéo (MP4/WebM/MOV ≤ 200 MB)',
        },
      },
    },
  })
  @ApiOkResponse({
    schema: {
      example: {
        url:          'https://cdn.superapp-bf.com/announcements/a1b2c3.jpg',
        mediaType:    'image',
        originalName: 'banner.jpg',
        sizeBytes:    204800,
        mimeType:     'image/jpeg',
      },
    },
  })
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.mediaStorage.save(file);
  }

  @Post('admin')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERM_ANNOUNCEMENTS_MANAGE)
  @ApiOperation({
    summary: '[Admin] Créer une annonce (brouillon)',
    description:
      'Crée une annonce en statut **DRAFT** (non visible par les utilisateurs).\n\n' +
      'La rendre visible : appeler `POST /announcements/admin/:id/publish`\n\n' +
      '**Scope** :\n' +
      '- `global` → toutes les villes (cityId ignoré)\n' +
      '- `city`   → uniquement la ville indiquée (`cityId` obligatoire)\n\n' +
      '**Types** : `info` · `maintenance` · `promotion` · `alert` · `update`',
  })
  @ApiCreatedResponse({
    schema: {
      example: {
        id: 'uuid',
        title: 'Maintenance programmée',
        status: 'draft',
        scope: 'global',
        type: 'maintenance',
      },
    },
  })
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  create(@Request() req: AuthRequest, @Body() dto: CreateAnnouncementDto) {
    return this.service.create(
      { id: req.user.id, role: req.user.role, cityId: req.user.cityId },
      dto,
    );
  }

  @Get('admin/list')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERM_ANNOUNCEMENTS_READ)
  @ApiOperation({
    summary: '[Admin] Lister toutes les annonces (avec filtres)',
    description:
      'Liste toutes les annonces peu importe leur statut.\n\n' +
      '**Filtres** : `status`, `scope`, `cityId`, `type`, `page`, `limit`',
  })
  @ApiOkResponse({
    schema: {
      example: {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    },
  })
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  listAll(@Query() filters: AnnouncementFilterDto) {
    return this.service.findAll(filters);
  }

  @Patch('admin/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERM_ANNOUNCEMENTS_MANAGE)
  @ApiParam({ name: 'id', description: 'UUID de l\'annonce' })
  @ApiOperation({
    summary: '[Admin] Modifier une annonce',
    description: 'Modifiable uniquement si statut = `draft` ou `published` (pas `archived`).',
  })
  @ApiOkResponse({ description: 'Annonce mise à jour' })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthRequest,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.service.update(id, { id: req.user.id, role: req.user.role, cityId: req.user.cityId }, dto);
  }

  @Post('admin/:id/publish')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERM_ANNOUNCEMENTS_MANAGE)
  @ApiParam({ name: 'id', description: 'UUID de l\'annonce' })
  @ApiOperation({
    summary: '[Admin] Publier une annonce',
    description:
      'Passe l\'annonce de `draft` à `published`.\n\n' +
      '**Effet immédiat** : déclenche un broadcast BullMQ sur tous les canaux configurés :\n' +
      '- `push`      → notification FCM sur tous les appareils ciblés\n' +
      '- `in_app`    → bannière dans le fil d\'annonces\n' +
      '- `websocket` → événement temps réel pour les connectés\n\n' +
      'Le `broadcastId` BullMQ est retourné pour suivi.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        id: 'uuid',
        status: 'published',
        publishedAt: '2026-03-04T20:00:00Z',
        broadcastId: 'uuid',
      },
    },
  })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthRequest,
  ) {
    return this.service.publish(id, { id: req.user.id, role: req.user.role, cityId: req.user.cityId });
  }

  @Post('admin/:id/archive')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERM_ANNOUNCEMENTS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'UUID de l\'annonce' })
  @ApiOperation({
    summary: '[Admin] Archiver une annonce',
    description: 'Masque l\'annonce du fil utilisateur. Irréversible via API (modifier en DB si besoin).',
  })
  @ApiOkResponse({ schema: { example: { id: 'uuid', status: 'archived' } } })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  archive(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthRequest) {
    return this.service.archive(id, req.user.id);
  }

  @Delete('admin/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERM_ANNOUNCEMENTS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'UUID de l\'annonce' })
  @ApiOperation({
    summary: '[Admin] Supprimer une annonce',
    description: 'Suppression physique uniquement si statut = `draft`. Archiver d\'abord si publiée.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthRequest) {
    return this.service.remove(id, req.user.id);
  }

  // ─── Nouveaux endpoints v2 ────────────────────────────────────────────────

  @Post('admin/:id/schedule')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERM_ANNOUNCEMENTS_MANAGE)
  @ApiParam({ name: 'id', description: 'UUID de l\'annonce' })
  @ApiOperation({
    summary: '[Admin] Planifier la publication',
    description: 'Définit une date future de publication automatique (DRAFT → SCHEDULED). Le cron publie automatiquement à l\'heure définie.',
  })
  @ApiOkResponse({ schema: { example: { id: 'uuid', status: 'scheduled', scheduledAt: '2026-03-10T09:00:00Z' } } })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthRequest,
    @Body('scheduledAt') scheduledAt: string,
  ) {
    return this.service.schedule(
      id,
      { id: req.user.id, role: req.user.role, cityId: req.user.cityId },
      new Date(scheduledAt),
    );
  }

  @Post('admin/:id/republish')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERM_ANNOUNCEMENTS_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'UUID de l\'annonce' })
  @ApiOperation({
    summary: '[Admin] Réactiver une annonce archivée',
    description: 'Remet une annonce ARCHIVED en DRAFT. Le contenu est conservé intégralement. L\'admin peut ensuite la modifier et la re-publier.',
  })
  @ApiOkResponse({ schema: { example: { id: 'uuid', status: 'draft' } } })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  republish(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthRequest,
  ) {
    return this.service.republish(id, { id: req.user.id, role: req.user.role, cityId: req.user.cityId });
  }

  @Post('admin/:id/duplicate')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERM_ANNOUNCEMENTS_MANAGE)
  @ApiParam({ name: 'id', description: 'UUID de l\'annonce source' })
  @ApiOperation({
    summary: '[Admin] Cloner une annonce',
    description: 'Crée une copie DRAFT de l\'annonce source. Utile pour les annonces récurrentes. Le titre est préfixé par `[Copie]`.',
  })
  @ApiOkResponse({ schema: { example: { id: 'new-uuid', title: '[Copie] Maintenance', status: 'draft' } } })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthRequest,
  ) {
    return this.service.duplicate(id, { id: req.user.id, role: req.user.role, cityId: req.user.cityId });
  }

  @Get('admin/:id/audit')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERM_ANNOUNCEMENTS_READ)
  @ApiParam({ name: 'id', description: 'UUID de l\'annonce' })
  @ApiOperation({
    summary: '[Admin] Journal d\'audit d\'une annonce',
    description: 'Retourne l\'historique de toutes les actions effectuées sur l\'annonce (création, modification, publication, archivage...).',
  })
  @ApiOkResponse({ description: 'Liste des entrées d\'audit' })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  getAuditLog(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getAuditLog(id);
  }

  @Get('admin/:id/audience')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERM_ANNOUNCEMENTS_READ)
  @ApiParam({ name: 'id', description: 'UUID de l\'annonce' })
  @ApiOperation({
    summary: '[Admin] Estimation d\'audience',
    description: 'Retourne le nombre estimé d\'utilisateurs qui recevront le broadcast (basé sur scope + ville + rôles).',
  })
  @ApiOkResponse({
    schema: {
      example: { estimatedUsers: 1250, scope: 'city', cityId: 'uuid', targetRoles: ['user'] },
    },
  })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  getAudience(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.estimateAudience(id);
  }

  @Get('admin/:id/reads')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERM_ANNOUNCEMENTS_READ)
  @ApiParam({ name: 'id', description: 'UUID de l\'annonce' })
  @ApiOperation({ summary: '[Admin] Nombre de lectures', description: 'Retourne le nombre d\'utilisateurs ayant marqué l\'annonce comme lue.' })
  @ApiOkResponse({ schema: { example: { announcementId: 'uuid', readCount: 342 } } })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  @ApiUnauthorizedResponse()
  getReadCount(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getReadCount(id);
  }

  @Post('me/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Marquer une annonce comme lue',
    description: 'Enregistre que l\'utilisateur connecté a lu l\'annonce. Idempotent (plusieurs appels = un seul enregistrement).',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async markAsRead(
    @Request() req: AuthRequest,
    @Body() dto: MarkReadDto,
  ): Promise<void> {
    await this.service.markAsRead(req.user.id, dto.announcementId);
  }
}
