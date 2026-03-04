import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../../../../infrastructure/redis/redis.service';

const REFRESH_TTL_SEC = 30 * 24 * 60 * 60; // 30 jours
const KEY_PREFIX      = 'rt:';              // rt:{refreshToken}
const USER_SET_PREFIX = 'rt:user:';         // rt:user:{userId} → SET des tokens actifs

export interface RefreshTokenPayload {
  userId:   string;
  phone:    string;
  cityId:   string;
  issuedAt: number;   // timestamp ms
}

@Injectable()
export class TokenService {
  private readonly ACCESS_EXPIRES_IN: string;

  constructor(
    private readonly jwt:   JwtService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.ACCESS_EXPIRES_IN = this.config.get<string>('JWT_EXPIRES_IN', '15m');
  }

  // ─── Génération ──────────────────────────────────────────────────────────────

  /**
   * Crée une paire access_token + refresh_token.
   * Le refresh_token est un UUID opaque stocké dans Redis.
   */
  async issueTokenPair(
    userId: string,
    phone:  string,
    cityId: string,
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const access_token = this.jwt.sign(
      { sub: userId, phone, cityId },
      { expiresIn: this.ACCESS_EXPIRES_IN as unknown as number },
    );

    const refresh_token = uuidv4();
    const payload: RefreshTokenPayload = { userId, phone, cityId, issuedAt: Date.now() };

    // Stocker le payload dans Redis avec TTL 30 jours
    await this.redis.setJson(`${KEY_PREFIX}${refresh_token}`, payload, REFRESH_TTL_SEC);

    // Indexer le token par userId pour pouvoir révoquer tous les tokens d'un user
    await this.redis.client.sadd(`${USER_SET_PREFIX}${userId}`, refresh_token);
    await this.redis.client.expire(`${USER_SET_PREFIX}${userId}`, REFRESH_TTL_SEC);

    // expires_in en secondes pour le client
    const decoded = this.jwt.decode(access_token) as { exp: number; iat: number };
    const expires_in = decoded.exp - decoded.iat;

    return { access_token, refresh_token, expires_in };
  }

  // ─── Rafraîchissement ────────────────────────────────────────────────────────

  /**
   * Échange un refresh_token valide contre une nouvelle paire de tokens.
   * Rotation : l'ancien token est révoqué après usage (one-time use).
   */
  async refresh(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const key = `${KEY_PREFIX}${refreshToken}`;
    const payload = await this.redis.getJson<RefreshTokenPayload>(key);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotation — invalider l'ancien token
    await this.redis.del(key);
    await this.redis.client.srem(`${USER_SET_PREFIX}${payload.userId}`, refreshToken);

    // Émettre une nouvelle paire
    return this.issueTokenPair(payload.userId, payload.phone, payload.cityId);
  }

  // ─── Révocation ──────────────────────────────────────────────────────────────

  /** Révoque UN refresh_token (logout d'un seul appareil) */
  async revoke(refreshToken: string): Promise<void> {
    const key     = `${KEY_PREFIX}${refreshToken}`;
    const payload = await this.redis.getJson<RefreshTokenPayload>(key);
    if (!payload) return; // déjà expiré ou inexistant
    await this.redis.del(key);
    await this.redis.client.srem(`${USER_SET_PREFIX}${payload.userId}`, refreshToken);
  }

  /** Révoque TOUS les refresh_tokens d'un utilisateur (logout global) */
  async revokeAll(userId: string): Promise<void> {
    const setKey = `${USER_SET_PREFIX}${userId}`;
    const tokens = await this.redis.client.smembers(setKey);

    if (tokens.length) {
      const pipeline = this.redis.client.pipeline();
      for (const t of tokens) pipeline.del(`${KEY_PREFIX}${t}`);
      pipeline.del(setKey);
      await pipeline.exec();
    }
  }
}
