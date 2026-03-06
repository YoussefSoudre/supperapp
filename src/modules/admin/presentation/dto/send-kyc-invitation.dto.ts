import {
  IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum, IsArray, ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum KycNotificationTarget {
  /** Envoi à un utilisateur précis via son UUID */
  SINGLE_USER = 'single_user',
  /** Broadcast à tous les utilisateurs sans KYC validé */
  ALL_WITHOUT_KYC = 'all_without_kyc',
  /** Broadcast à une ville entière (sans KYC validé) */
  CITY = 'city',
}

export class SendKycInvitationDto {
  @ApiProperty({
    enum: KycNotificationTarget,
    description:
      '`single_user` → un utilisateur ciblé (requiert `userId`)\n' +
      '`all_without_kyc` → tous les clients sans KYC approuvé\n' +
      '`city` → tous les clients sans KYC approuvé dans une ville (requiert `cityId`)',
    example: KycNotificationTarget.ALL_WITHOUT_KYC,
  })
  @IsEnum(KycNotificationTarget)
  target: KycNotificationTarget;

  @ApiPropertyOptional({
    description: 'UUID de l\'utilisateur ciblé (obligatoire si `target = single_user`)',
    example: 'uuid-v4-user',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'UUID de la ville ciblée (obligatoire si `target = city`)',
    example: 'uuid-v4-city',
  })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiProperty({
    example: '🔐 Vérifiez votre identité',
    description: 'Titre personnalisable de la notification',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Complétez votre KYC pour accéder à toutes les fonctionnalités de SuperApp BF.',
    description: 'Corps du message personnalisable',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({
    description: 'Canaux d\'envoi. Défaut : `["push", "in_app"]`',
    example: ['push', 'in_app'],
    isArray: true,
    enum: ['push', 'in_app', 'sms', 'email'],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  channels?: string[];
}
