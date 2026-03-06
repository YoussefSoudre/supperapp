import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum KycReviewDecision {
  APPROVE = 'approve',
  REJECT  = 'reject',
}

export class ReviewUserKycDto {
  @ApiProperty({
    enum: KycReviewDecision,
    description: '`approve` pour valider le dossier, `reject` pour le refuser',
    example: KycReviewDecision.APPROVE,
  })
  @IsEnum(KycReviewDecision)
  decision: KycReviewDecision;

  @ApiPropertyOptional({
    example: 'La pièce d\'identité est illisible. Merci de rescanner en haute qualité.',
    description: 'Obligatoire si `decision = reject`. Motif communiqué au client.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  rejectionReason?: string;
}
