import { CitiesService } from '../application/cities.service';
export declare class CitiesController {
    private readonly citiesService;
    constructor(citiesService: CitiesService);
    findAll(): Promise<import("../domain/entities/city.entity").City[]>;
    findBySlug(slug: string): Promise<import("../domain/entities/city.entity").City | null>;
}
