import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { SystemAnnouncement } from './domain/entities/announcement.entity';
import { AnnouncementRead } from './domain/entities/announcement-read.entity';
import { AnnouncementAuditLog } from './domain/entities/announcement-audit-log.entity';
import { AnnouncementsService } from './application/announcements.service';
import { MediaStorageService } from './application/media-storage.service';
import { AnnouncementsCronService } from './application/announcements-cron.service';
import { AnnouncementsController } from './presentation/announcements.controller';
import { NotificationsModule } from '../notifications/notifications.module';

// Garantit que les dossiers uploads existent au démarrage
mkdirSync(join(process.cwd(), 'uploads', 'tmp'),           { recursive: true });
mkdirSync(join(process.cwd(), 'uploads', 'announcements'), { recursive: true });

/**
 * AnnouncementsModule
 * ────────────────────
 * Gestion des annonces système créées par les admins.
 *
 * Flux :
 *   Admin → POST /announcements/admin/media       (uploader image/vidéo)
 *         → POST /announcements/admin              (créer en brouillon + mediaUrl)
 *         → POST /announcements/admin/:id/publish  (publier + broadcast)
 *
 * Utilisateurs :
 *   GET /announcements → feed des annonces actives de leur ville
 *
 * Dépendances :
 *   - NotificationsModule : BroadcastService (fan-out push/in_app/websocket)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([SystemAnnouncement, AnnouncementRead, AnnouncementAuditLog]),
    NotificationsModule,
    MulterModule.register({}),
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, MediaStorageService, AnnouncementsCronService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
