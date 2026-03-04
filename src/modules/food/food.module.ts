import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodOrder } from './domain/entities/food-order.entity';
import { Restaurant } from './domain/entities/restaurant.entity';
import { FoodController } from './presentation/food.controller';
import { FoodService } from './application/food.service';

/**
 * FoodModule — Restaurants, menus, commandes de nourriture.
 * Émet: food.order.placed, food.order.confirmed, food.order.delivered
 * Écoute: payment.success → confirme la commande
 */
@Module({
  imports: [TypeOrmModule.forFeature([FoodOrder, Restaurant])],
  controllers: [FoodController],
  providers: [FoodService],
  exports: [FoodService],
})
export class FoodModule {}
