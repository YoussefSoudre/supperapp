import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { User } from './domain/entities/user.entity';
import { UserKyc } from './domain/entities/user-kyc.entity';
import { UsersController } from './presentation/users.controller';
import { UsersService } from './application/users.service';
import { KycStorageService } from './application/kyc-storage.service';
import { AdminModule } from '../admin/admin.module';

// Création des dossiers uploads KYC au démarrage
mkdirSync(join(process.cwd(), 'uploads', 'tmp'), { recursive: true });
mkdirSync(join(process.cwd(), 'uploads', 'kyc'), { recursive: true });

/**
 * UsersModule — Gestion des profils utilisateurs.
 * Responsabilités: CRUD profil, KYC client, upload documents, FCM tokens.
 * Ne gère PAS l'authentification (→ AuthModule).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserKyc]),
    MulterModule.register({}),
    AdminModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, KycStorageService],
  exports: [UsersService],
})
export class UsersModule {}
