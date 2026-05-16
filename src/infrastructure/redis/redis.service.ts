import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  // Always a Redis instance — lazyConnect means no crash when host is absent
  client: Redis;

  constructor(private readonly config: ConfigService) {}

  get available(): boolean {
    return this.client.status === 'ready';
  }

  onModuleInit(): void {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const redisConfigured = !!this.config.get<string>('REDIS_HOST');

    this.client = new Redis({
      host,
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD'),
      db: 0,
      lazyConnect: true,
      enableOfflineQueue: false,
      // Stop retrying if Redis is not configured — avoids flood of error logs
      retryStrategy: redisConfigured ? (times) => Math.min(times * 200, 5000) : () => null,
    });

    if (redisConfigured) {
      void this.client.connect().catch(() => {});
      this.client.on('connect', () => this.logger.log('Redis connected'));
      this.client.on('error', (err) => this.logger.error('Redis error', err.message));
    } else {
      this.logger.warn('REDIS_HOST not set — Redis disabled, falling back to in-memory where possible');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') await this.client.quit().catch(() => {});
  }

  async get(key: string): Promise<string | null> {
    try { return await this.client.get(key); } catch { return null; }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) await this.client.set(key, value, 'EX', ttlSeconds);
      else await this.client.set(key, value);
    } catch { /* Redis not available */ }
  }

  async del(key: string): Promise<void> {
    try { await this.client.del(key); } catch { /* Redis not available */ }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.setJson(key, value, ttlSeconds);
    return value;
  }
}
