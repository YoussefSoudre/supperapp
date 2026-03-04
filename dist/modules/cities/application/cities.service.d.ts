import { Repository } from 'typeorm';
import { City } from '../domain/entities/city.entity';
import { RedisService } from '../../../infrastructure/redis/redis.service';
export declare class CitiesService {
    private readonly repo;
    private readonly redis;
    private readonly CACHE_KEY;
    private readonly CACHE_TTL;
    constructor(repo: Repository<City>, redis: RedisService);
    findAll(): Promise<City[]>;
    findBySlug(slug: string): Promise<City | null>;
    findById(id: string): Promise<City | null>;
}
