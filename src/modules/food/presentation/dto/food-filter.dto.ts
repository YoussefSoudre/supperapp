import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseFilterDto } from '../../../../shared/dto/base-filter.dto';
import { FoodOrderStatus } from '../../domain/entities/food-order.entity';

/**
 * FoodOrderFilterDto — Filtres pour GET /food/orders
 *
 * Standard  : page, limit, sortBy (createdAt|total), sortOrder, dateFrom, dateTo
 * Avancés   : status, restaurantId
 */
export class FoodOrderFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    enum: FoodOrderStatus,
    isArray: true,
    description: 'Filtrer par statut(s)',
    example: ['delivered', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(FoodOrderStatus, { each: true })
  status?: FoodOrderStatus | FoodOrderStatus[];

  @ApiPropertyOptional({ description: 'Filtrer par restaurant' })
  @IsOptional()
  @IsUUID()
  restaurantId?: string;
}

/**
 * RestaurantFilterDto — Filtres pour GET /food/restaurants
 *
 * Standard  : search (nom du restaurant)
 * Avancés   : cityId, category, isActive, minRating, sortBy (rating|name)
 */
export class RestaurantFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({ description: 'Ville obligatoire pour la liste publique' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({
    description: 'Catégorie culinaire',
    example: 'Burgers',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'N\'afficher que les restaurants actifs (défaut: true)',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean = true;
}
