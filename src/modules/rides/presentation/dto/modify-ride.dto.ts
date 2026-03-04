import {
  IsOptional, IsString, IsNumber, IsISO8601,
  IsLatitude, IsLongitude, MaxLength, Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO — Modification d'une course avant départ.
 * Au moins un champ de déstination OU newScheduledAt doit être fourni.
 * Validation croisée dans le use case.
 */
export class ModifyRideBeforeDepartureDto {
  @ApiPropertyOptional({ example: 'Marché de Rood Woko, Ouagadougou' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  newDropoffAddress?: string;

  @ApiPropertyOptional({ example: 12.3647 })
  @IsOptional()
  @IsLatitude()
  newDropoffLat?: number;

  @ApiPropertyOptional({ example: -1.5333 })
  @IsOptional()
  @IsLongitude()
  newDropoffLng?: number;

  @ApiPropertyOptional({ example: '2026-03-03T18:30:00Z', description: 'ISO8601 — pour décaler une course planifiée' })
  @IsOptional()
  @IsISO8601()
  newScheduledAt?: string;

  @ApiPropertyOptional({ example: 'Changement de destination de dernière minute' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * DTO — Modification de destination en cours de route.
 * Seule la destination peut changer (pickup déjà effectué).
 * Le chauffeur sera notifié et peut refuser dans les 2 minutes.
 */
export class ModifyRideEnRouteDto {
  @ApiPropertyOptional({ example: 'Hôpital Yalgado, Ouagadougou' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  newDropoffAddress?: string;

  @IsOptional()
  @IsLatitude()
  newDropoffLat?: number;

  @IsOptional()
  @IsLongitude()
  newDropoffLng?: number;

  @ApiPropertyOptional({ example: 'Urgence médicale' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * DTO — Réponse chauffeur à une proposition de modification en cours de route.
 * Endpoint: PATCH /rides/:id/modification/respond
 */
export class DriverModificationResponseDto {
  @ApiPropertyOptional({ example: true })
  accepted: boolean;

  @ApiPropertyOptional({ example: 'Destination trop éloignée de mon trajet' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
