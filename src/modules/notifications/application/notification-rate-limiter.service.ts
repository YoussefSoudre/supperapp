import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { RATE_LIMITS } from '../domain/constants/notification.constants';
import { NotificationChannel } from '../domain/entities/notification.entity';

/**
 * NotificationRateLimiterService
 * Implémente un sliding window counter par (userId, channel) dans Redis.
 *
 * Algorithme :
 *  1. ZREMRANGEBYSCORE  — purge les entrées hors fenêtre
 *  2. ZCARD             — compte les entrées restantes
 *  3. Si count >= max → bloqué
 *  4. Sinon ZADD + EXPIRE → autorisé
 *
 * Clé Redis : notif:rl:{channel}:{userId}
 */
@Injectable()
export class NotificationRateLimiterService {
  private readonly logger = new Logger(NotificationRateLimiterService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Vérifie & consomme un token.
   * @returns true si l'envoi est autorisé, false si rate-limited.
   */
  async consume(userId: string, channel: NotificationChannel): Promise<boolean> {
    const limit = RATE_LIMITS[channel];
    if (!limit) return true; // canal inconnu → pas de limite

    const key  = `notif:rl:${channel}:${userId}`;
    const now  = Date.now();
    const from = now - limit.windowSec * 1_000;

    try {
      const pipeline = this.redis.client.pipeline();
      // 1. Purge les entrées hors fenêtre
      pipeline.zremrangebyscore(key, '-inf', from);
      // 2. Compte les entrées restantes
      pipeline.zcard(key);
      const results = await pipeline.exec();

      const count = (results?.[1]?.[1] as number) ?? 0;
      if (count >= limit.max) {
        this.logger.warn(
          `Rate limit hit: userId=${userId} channel=${channel} count=${count}/${limit.max}`,
        );
        return false;
      }

      // 3. Ajoute l'entrée courante et pose l'expiry sur la fenêtre
      await this.redis.client.zadd(key, now, `${now}-${Math.random()}`);
      await this.redis.client.expire(key, limit.windowSec);
      return true;
    } catch (err) {
      // En cas d'erreur Redis → on autorise pour éviter de bloquer l'UX
      this.logger.error(`RateLimiter Redis error for ${key}`, err);
      return true;
    }
  }

  /** Retourne le nombre de tokens consommés dans la fenêtre courante. */
  async getCount(userId: string, channel: NotificationChannel): Promise<number> {
    const limit = RATE_LIMITS[channel];
    if (!limit) return 0;

    const key  = `notif:rl:${channel}:${userId}`;
    const from = Date.now() - limit.windowSec * 1_000;
    await this.redis.client.zremrangebyscore(key, '-inf', from);
    return this.redis.client.zcard(key);
  }

  /** Retourne le nombre de tokens restants dans la fenêtre. */
  async getRemaining(userId: string, channel: NotificationChannel): Promise<number> {
    const limit = RATE_LIMITS[channel];
    if (!limit) return 999;

    const count = await this.getCount(userId, channel);
    return Math.max(0, limit.max - count);
  }
}
