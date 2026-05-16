import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from './redis.service';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  // In-memory fallback when Redis is unavailable
  private readonly store = new Map<string, { hits: number; expiresAt: number }>();

  constructor(private readonly redisService: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<{ totalHits: number; timeToExpire: number; isBlocked: boolean; timeToBlockExpire: number }> {
    if (this.redisService.available && this.redisService.client) {
      return this.incrementRedis(key, ttl, limit, blockDuration, throttlerName);
    }
    return this.incrementMemory(key, ttl);
  }

  private async incrementRedis(
    key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string,
  ): Promise<{ totalHits: number; timeToExpire: number; isBlocked: boolean; timeToBlockExpire: number }> {
    const client   = this.redisService.client!;
    const redisKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle:${throttlerName}:${key}:block`;
    const ttlSec   = Math.ceil(ttl / 1000);
    const blockSec = Math.ceil(blockDuration / 1000);

    const blocked = await this.redisService.get(blockKey);
    if (blocked) {
      const timeToBlockExpire = await client.ttl(blockKey);
      return { totalHits: limit + 1, timeToExpire: 0, isBlocked: true, timeToBlockExpire: Math.max(timeToBlockExpire, 0) * 1000 };
    }

    const totalHits = await client.incr(redisKey);
    if (totalHits === 1) await client.expire(redisKey, ttlSec);
    const timeToExpire = await client.ttl(redisKey);

    let isBlocked = false;
    let timeToBlockExpire = 0;
    if (totalHits > limit && blockDuration > 0) {
      await client.set(blockKey, '1', 'EX', blockSec);
      isBlocked = true;
      timeToBlockExpire = blockSec * 1000;
    }

    return { totalHits, timeToExpire: Math.max(timeToExpire, 0) * 1000, isBlocked, timeToBlockExpire };
  }

  private incrementMemory(key: string, ttl: number): { totalHits: number; timeToExpire: number; isBlocked: boolean; timeToBlockExpire: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.expiresAt <= now) {
      this.store.set(key, { hits: 1, expiresAt: now + ttl });
      return { totalHits: 1, timeToExpire: ttl, isBlocked: false, timeToBlockExpire: 0 };
    }

    entry.hits += 1;
    return { totalHits: entry.hits, timeToExpire: entry.expiresAt - now, isBlocked: false, timeToBlockExpire: 0 };
  }
}
