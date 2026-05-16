import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  get available(): boolean {
    return this.client !== null;
  }

  onModuleInit(): void {
    const host = this.config.get<string>('REDIS_HOST');
    if (!host) {
      this.logger.warn('REDIS_HOST not set — Redis disabled, using in-memory fallbacks');
      return;
    }
    this.client = new Redis({
      host,
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD'),
      db: 0,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err.message));
    void this.client.connect().catch(() => {});
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client ? this.client.get(key) : null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (this.client) await this.client.del(key);
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
