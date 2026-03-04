import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { RedisService } from '../../infrastructure/redis/redis.service';

/**
 * BruteForceGuard — protection Redis contre les attaques par force brute.
 *
 * Stratégie double :
 *  - Par IP        : max 15 tentatives / 15 min → blocage 30 min
 *  - Par identifiant (phone/email extrait du body) : max 5 échecs / 10 min → blocage 20 min
 *
 * Clés Redis utilisées :
 *  bf:ip:{ip}            — compteur d'essais par IP
 *  bf:lock:ip:{ip}       — verrou par IP
 *  bf:id:{identifier}    — compteur d'essais par identifiant
 *  bf:lock:id:{identifier} — verrou par identifiant
 *
 * Usage : @UseGuards(BruteForceGuard) sur les endpoints login / register / otp
 */
@Injectable()
export class BruteForceGuard implements CanActivate {
  private readonly logger = new Logger(BruteForceGuard.name);

  // ─── Paramètres IP ────────────────────────────────────────────────────────
  private readonly IP_MAX_ATTEMPTS   = 15;
  private readonly IP_WINDOW_SEC     = 15 * 60;   // 15 min
  private readonly IP_LOCK_SEC       = 30 * 60;   // 30 min

  // ─── Paramètres identifiant ───────────────────────────────────────────────
  private readonly ID_MAX_ATTEMPTS   = 5;
  private readonly ID_WINDOW_SEC     = 10 * 60;   // 10 min
  private readonly ID_LOCK_SEC       = 20 * 60;   // 20 min

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const ip  = this.getClientIp(req);

    // ── 1. Vérifier le verrou IP ───────────────────────────────────────────
    const ipLockKey = `bf:lock:ip:${ip}`;
    const isIpLocked = await this.redisService.get(ipLockKey);
    if (isIpLocked) {
      const ttl = await this.redisService.client.ttl(ipLockKey);
      this.logger.warn(`Blocked IP ${ip} — ${ttl}s remaining`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Trop de tentatives. Réessayez dans ${Math.ceil(ttl / 60)} minutes.`,
          retryAfter: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // ── 2. Vérifier verrou par identifiant ────────────────────────────────
    const identifier = this.extractIdentifier(req);
    if (identifier) {
      const idLockKey = `bf:lock:id:${identifier}`;
      const isIdLocked = await this.redisService.get(idLockKey);
      if (isIdLocked) {
        const ttl = await this.redisService.client.ttl(idLockKey);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Ce compte est temporairement bloqué. Réessayez dans ${Math.ceil(ttl / 60)} minutes.`,
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // ── 3. Incrémenter compteur IP ────────────────────────────────────────
    const ipCountKey = `bf:ip:${ip}`;
    const ipCount = await this.increment(ipCountKey, this.IP_WINDOW_SEC);
    if (ipCount > this.IP_MAX_ATTEMPTS) {
      await this.redisService.client.set(ipLockKey, '1', 'EX', this.IP_LOCK_SEC);
      this.logger.warn(`IP ${ip} locked after ${ipCount} attempts`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Trop de tentatives depuis votre IP. Accès bloqué ${this.IP_LOCK_SEC / 60} minutes.`,
          retryAfter: this.IP_LOCK_SEC,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // ── 4. Incrémenter compteur identifiant ──────────────────────────────
    if (identifier) {
      const idCountKey = `bf:id:${identifier}`;
      const idCount = await this.increment(idCountKey, this.ID_WINDOW_SEC);
      if (idCount > this.ID_MAX_ATTEMPTS) {
        const idLockKey = `bf:lock:id:${identifier}`;
        await this.redisService.client.set(idLockKey, '1', 'EX', this.ID_LOCK_SEC);
        this.logger.warn(`Identifier ${identifier} locked after ${idCount} attempts`);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Ce compte est temporairement bloqué. Réessayez dans ${this.ID_LOCK_SEC / 60} minutes.`,
            retryAfter: this.ID_LOCK_SEC,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Incrémente la clé Redis et applique le TTL si c'est le premier accès. */
  private async increment(key: string, ttlSec: number): Promise<number> {
    const count = await this.redisService.client.incr(key);
    if (count === 1) {
      await this.redisService.client.expire(key, ttlSec);
    }
    return count;
  }

  /**
   * Extrait l'IP réelle en tenant compte des proxies inverses.
   * Nécessite `app.set('trust proxy', 1)` dans main.ts.
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }

  /**
   * Extrait l'identifiant (téléphone ou email) du body de la requête.
   * Utilisé pour bloquer les tentatives ciblant un compte spécifique.
   */
  private extractIdentifier(req: Request): string | null {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body) return null;
    const phone = body['phone'] ?? body['phoneNumber'];
    const email = body['email'];
    const raw = (phone ?? email) as string | undefined;
    if (!raw || typeof raw !== 'string') return null;
    // Normaliser : minuscule, suppression espaces
    return raw.toLowerCase().replace(/\s+/g, '').slice(0, 100);
  }
}
