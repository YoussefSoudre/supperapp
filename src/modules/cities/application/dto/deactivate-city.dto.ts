import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DeactivateCityDto {
  @ApiPropertyOptional({
    example: 'La ville de Kaya est temporairement suspendue pour maintenance opérationnelle.',
    description:
      'Message optionnel à envoyer aux utilisateurs de la ville lors de la désactivation. ' +
      'Si absent, un message générique est utilisé.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
