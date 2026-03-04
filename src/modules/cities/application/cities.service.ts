import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City, CityStatus } from '../domain/entities/city.entity';
import { RedisService } from '../../../infrastructure/redis/redis.service';

@Injectable()
export class CitiesService {
  private readonly CACHE_KEY = 'cities:active';
  private readonly CACHE_TTL = 3600; // 1 heure

  constructor(
    @InjectRepository(City)
    private readonly repo: Repository<City>,
    private readonly redis: RedisService,
  ) {}

  async findAll(): Promise<City[]> {
    return this.redis.getOrSet(
      this.CACHE_KEY,
      () => this.repo.find({ where: { status: CityStatus.ACTIVE }, order: { name: 'ASC' } }),
      this.CACHE_TTL,
    );
  }

  async findBySlug(slug: string): Promise<City | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async findById(id: string): Promise<City | null> {
    return this.redis.getOrSet(
      `city:${id}`,
      () => this.repo.findOne({ where: { id } }),
      this.CACHE_TTL,
    );
  }
}
