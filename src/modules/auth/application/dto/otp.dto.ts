import { IsPhoneNumber, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({
    example: '+22670000000',
    description: 'Numéro de téléphone au format international (E.164) — recevra le SMS',
  })
  @IsPhoneNumber()
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    example: '+22670000000',
    description: 'Même numéro utilisé lors de l\'envoi OTP',
  })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({
    example: '482917',
    description: 'Code OTP à 6 chiffres reçu par SMS',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Refresh token UUID obtenu lors du login ou du dernier /auth/refresh',
  })
  @IsString()
  refresh_token: string;
}

