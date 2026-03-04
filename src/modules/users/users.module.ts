import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/user.entity';
import { UsersController } from './presentation/users.controller';
import { UsersService } from './application/users.service';

/**
 * UsersModule — Gestion des profils utilisateurs.
 * Responsabilités: CRUD profil, KYC, adresses, FCM tokens.
 * Ne gère PAS l'authentification (→ AuthModule).
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
