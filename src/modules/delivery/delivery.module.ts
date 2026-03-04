import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from './domain/entities/delivery.entity';
import { DeliveryController } from './presentation/delivery.controller';
import { DeliveryService } from './application/delivery.service';

/**
 * DeliveryModule — Livraison de colis point à point.
 * Émet: delivery.created, delivery.picked_up, delivery.completed
 * Écoute: payment.success → marque livraison payée
 */
@Module({
  imports: [TypeOrmModule.forFeature([Delivery])],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
