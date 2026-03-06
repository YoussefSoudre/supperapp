import { IsString, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitUserKycDto {
  @ApiProperty({
    example: 'https://cdn.superapp.bf/uploads/kyc/id_front_abc123.jpg',
    description: 'URL du recto de la pièce d\'identité (CNI ou passeport) uploadée via /uploads',
  })
  @IsString()
  @IsUrl()
  idCardFrontUrl: string;

  @ApiPropertyOptional({
    example: 'https://cdn.superapp.bf/uploads/kyc/id_back_abc123.jpg',
    description: 'URL du verso de la pièce d\'identité (null si passeport)',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  idCardBackUrl?: string;

  @ApiProperty({
    example: 'https://cdn.superapp.bf/uploads/kyc/selfie_abc123.jpg',
    description: 'URL du selfie du client tenant sa pièce d\'identité visible',
  })
  @IsString()
  @IsUrl()
  selfieUrl: string;

  @ApiPropertyOptional({
    example: 'https://cdn.superapp.bf/uploads/kyc/address_proof_abc123.jpg',
    description: 'URL du justificatif de domicile (optionnel)',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  addressProofUrl?: string;
}
