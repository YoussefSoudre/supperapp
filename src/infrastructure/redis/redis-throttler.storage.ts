import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from './redis.service';

/**
 * Implémentation Redis du stockage des compteurs de rate-limiting (@nestjs/throttler).
 *
 * Remplace le stockage en mémoire par défaut — indispensable en production
 * multi-instances (plusieurs pods) pour partager les compteurs.
 *
 * Clés Redis utilisées :
 *   throttle:{throttlerName}:{key}       → compteur de hits (incrément)
 *   throttle:{throttlerName}:{key}:block → flag de blocage
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redisService: RedisService) {}

  async increment(
    key: string,
    ttl: number,          // durée de la fenêtre en millisecondes
    limit: number,
    blockDuration: number, // durée de blocage en millisecondes (0 si non bloquant)
    throttlerName: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    const redisKey  = `throttle:${throttlerName}:${key}`;
    const blockKey  = `throttle:${throttlerName}:${key}:block`;
    const ttlSec    = Math.ceil(ttl / 1000);
    const blockSec  = Math.ceil(blockDuration / 1000);

    // ── Vérifier si déjà bloqué ──────────────────────────────────────────
    const blocked = await this.redisService.get(blockKey);
    if (blocked) {
      const timeToBlockExpire = await this.redisService.client.ttl(blockKey);
      return {
        totalHits:        limit + 1,
        timeToExpire:     0,
        isBlocked:        true,
        timeToBlockExpire: Math.max(timeToBlockExpire, 0) * 1000,
      };
    }

    // ── Incrémenter le compteur ───────────────────────────────────────────
    const totalHits  = await this.redisService.client.incr(redisKey);
    if (totalHits === 1) {
      // Première requête dans la fenêtre — appliquer le TTL
      await this.redisService.client.expire(redisKey, ttlSec);
    }

    const timeToExpire = await this.redisService.client.ttl(redisKey);

    // ── Bloquer si la limite est dépassée ─────────────────────────────────
    let isBlocked       = false;
    let timeToBlockExpire = 0;

    if (totalHits > limit && blockDuration > 0) {
      await this.redisService.client.set(blockKey, '1', 'EX', blockSec);
      isBlocked       = true;
      timeToBlockExpire = blockSec * 1000;
    }

    return {
      totalHits,
      timeToExpire:     Math.max(timeToExpire, 0) * 1000,
      isBlocked,
      timeToBlockExpire,
    };
  }
}
