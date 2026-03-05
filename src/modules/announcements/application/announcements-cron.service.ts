import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnnouncementsService } from './announcements.service';

/**
 * AnnouncementsCronService
 * ─────────────────────────
 * Gère les tâches planifiées liées aux annonces :
 *
 *   1. `publishScheduled`  (toutes les minutes)
 *      Publie automatiquement les annonces dont scheduledAt <= maintenant.
 *      DRAFT/SCHEDULED → PUBLISHED → broadcast BullMQ déclenché.
 *
 *   2. `expireOutdated`    (toutes les 5 minutes)
 *      Archive automatiquement les annonces dont expiresAt est dépassé.
 *      PUBLISHED → ARCHIVED.
 *
 * Les deux méthodes sont idempotentes : exécuter deux fois = même résultat.
 */
@Injectable()
export class AnnouncementsCronService {
  private readonly logger = new Logger(AnnouncementsCronService.name);

  constructor(private readonly service: AnnouncementsService) {}

  /**
   * Publie les annonces planifiées dont scheduledAt <= maintenant.
   * Cron : toutes les minutes.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduled(): Promise<void> {
    const count = await this.service.publishScheduled();
    if (count > 0) {
      this.logger.log(`[CRON] Published ${count} scheduled announcement(s)`);
    }
  }

  /**
   * Archive les annonces dont la date d'expiration est dépassée.
   * Cron : toutes les 5 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireOutdated(): Promise<void> {
    const count = await this.service.expireOutdated();
    if (count > 0) {
      this.logger.log(`[CRON] Archived ${count} expired announcement(s)`);
    }
  }
}
