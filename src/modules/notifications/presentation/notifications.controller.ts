import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiOkResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiParam, ApiUnauthorizedResponse, ApiQuery } from '@nestjs/swagger';

import { NotificationsService } from '../application/notifications.service';
import { BroadcastService }      from '../application/broadcast.service';
import {
  SendNotificationDto,
  BroadcastNotificationDto,
} from './dto/notification.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { Roles }  from '../../../shared/decorators/roles.decorator';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from '../domain/entities/notification.entity';

interface AuthRequest {
  user: { id: string; role: string };
}

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly broadcastService: BroadcastService,
  ) {}

  // ─── User endpoints ────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Mes notifications (paginées + filtrées)',
    description:
      '**Filtres standards** : `page`, `limit`, `sortBy` (createdAt|readAt), `sortOrder`, `dateFrom`, `dateTo`\n\n' +
      '**Filtres avancés** : `category` (ride|food|delivery|payment|system|promo), `channel` (push|email|sms|in_app), `priority` (low|normal|high|critical), `isRead` (true=lues, false=non lues)',
  })
  @ApiOkResponse({ description: 'Liste paginée de notifications', schema: { example: { data: [], total: 42, page: 1, limit: 20, totalPages: 3 } } })
  @ApiUnauthorizedResponse()
  findAll(
    @Request() req: AuthRequest,
    @Query() filters: NotificationFilterDto,
  ) {
    return this.notificationsService.findAll(req.user.id, filters);
  }

  @Patch(':id/read')
  @ApiParam({ name: 'id', description: 'UUID de la notification' })
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiOkResponse({ description: 'Notification marquée lue', schema: { example: { id: 'uuid', isRead: true, readAt: '2025-01-01T12:00:00Z' } } })
  @ApiNotFoundResponse({ description: 'Notification introuvable' })
  @ApiUnauthorizedResponse()
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthRequest,
  ) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  @ApiOkResponse({ description: 'Toutes les notifications lues', schema: { example: { updated: 15 } } })
  @ApiUnauthorizedResponse()
  markAllAsRead(@Request() req: AuthRequest) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Get('scheduled')
  @ApiOperation({ summary: 'Notifications programmées de l\'utilisateur', description: 'Retourne les notifications planifiées (jobs en attente dans BullMQ).' })
  @ApiOkResponse({ schema: { example: { data: [] } } })
  @ApiUnauthorizedResponse()
  getScheduled(@Request() req: AuthRequest) {
    return this.notificationsService.getScheduled(req.user.id);
  }

  @Delete('scheduled/:id')
  @ApiParam({ name: 'id', description: 'UUID de la notification programmée' })
  @ApiOperation({ summary: 'Annuler une notification programmée' })
  @ApiNoContentResponse({ description: 'Notification annulée (retourne `true`)' })
  @ApiNotFoundResponse({ description: 'Job introuvable ou déjà envoyé' })
  cancelScheduled(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<boolean> {
    return this.notificationsService.cancelScheduled(id);
  }

  @Get(':id/delivery-logs')
  @ApiParam({ name: 'id', description: 'UUID de la notification' })
  @ApiOperation({ summary: 'Logs de livraison d\'une notification', description: 'Canal, statut (sent|failed), tentatives, erreur.' })
  @ApiOkResponse({ schema: { example: { data: [{ channel: 'push', status: 'sent', attempts: 1, sentAt: '2025-01-01T12:00:00Z' }] } } })
  @ApiUnauthorizedResponse()
  getDeliveryLogs(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.getDeliveryLogs(id);
  }

  // ─── Admin endpoints ───────────────────────────────────────────────────────

  @Post('admin/send')
  @Roles('admin')
  @ApiOperation({
    summary: '[Admin] Envoyer une notification individuelle',
    description:
      'Envoie une notification ciblée à un utilisateur spécifique.\n\n' +
      '**Canaux disponibles** : `push` (FCM), `email`, `sms` (Orange/Moov), `in_app`\n\n' +
      '- `scheduledAt` : ISO8601 — planifie l\'envoi dans BullMQ\n' +
      '- `priority` : low | normal | high | critical (défaut: normal)',
  })
  @ApiOkResponse({ description: 'Notification envoyée ou planifiée' })
  @ApiUnauthorizedResponse()
  sendDirect(
    @Body() dto: SendNotificationDto,
    @Request() _req: AuthRequest,
  ) {
    return this.notificationsService.notify({
      userId:          dto.userId,
      channel:         dto.channel,
      category:        dto.category,
      title:           dto.title,
      body:            dto.body,
      priority:        dto.priority ?? NotificationPriority.NORMAL,
      data:            dto.data,
      deviceToken:     dto.deviceToken,
      recipientEmail:  dto.recipientEmail,
      recipientPhone:  dto.recipientPhone,
      scheduledAt:     dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
  }

  @Post('admin/broadcast')
  @Roles('admin')
  @ApiOperation({
    summary: '[Admin] Broadcast par ville / rôle',
    description:
      'Envoie une notification à un groupe de citoyens.\n\n' +
      '**Cibles** (combinables) :\n' +
      '- `targetCityId` : UUID de la ville (null = toutes les villes)\n' +
      '- `targetRole` : user | driver | admin (null = tous les rôles)\n\n' +
      '- `scheduledAt` : planifié — sinon envoi immédiat',
  })
  @ApiOkResponse({ description: 'Broadcast démarré, ID retourné', schema: { example: { broadcastId: 'uuid', status: 'queued', estimatedRecipients: 340 } } })
  @ApiUnauthorizedResponse()
  broadcast(
    @Body() dto: BroadcastNotificationDto,
    @Request() req: AuthRequest,
  ) {
    return this.broadcastService.send({
      createdBy:    req.user.id,
      targetCityId: dto.targetCityId ?? null,
      targetRole:   dto.targetRole ?? null,
      title:        dto.title,
      body:         dto.body,
      channels:     dto.channels,
      category:     dto.category as NotificationCategory,
      priority:     dto.priority as NotificationPriority | undefined,
      data:         dto.data,
      filters:      dto.filters,
      scheduledAt:  dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
  }

  @Get('admin/broadcast/:id')
  @Roles('admin')
  @ApiParam({ name: 'id', description: 'UUID du broadcast' })
  @ApiOperation({ summary: '[Admin] Statut d\'un broadcast', description: 'Retourne le nombre de destinataires, le nombre envoyé/échoué et le statut global.' })
  @ApiOkResponse({ schema: { example: { id: 'uuid', status: 'completed', total: 340, sent: 335, failed: 5 } } })
  getBroadcastStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.broadcastService.getStatus(id);
  }

  @Get('admin/stats')
  @Roles('admin')
  @ApiOperation({
    summary: '[Admin] Statistiques de livraison des notifications',
    description: 'Retourne le taux de livraison, d\'ouverture et d\'erreur par canal sur la période indiquée.',
  })
  @ApiOkResponse({ schema: { example: { push: { sent: 1200, failed: 30 }, email: { sent: 800, failed: 12 } } } })
  @ApiUnauthorizedResponse()
  getStats(@Query('since') since?: string) {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 7 * 86_400_000);
    return this.notificationsService.getStats(sinceDate);
  }

  @Get('admin/scheduled')
  @Roles('admin')
  @ApiOperation({ summary: '[Admin] Toutes les notifications programmées', description: 'Liste tous les jobs en attente de livraison dans BullMQ.' })
  @ApiOkResponse({ schema: { example: { data: [] } } })
  getAllScheduled() {
    return this.notificationsService.getScheduled();
  }
}

