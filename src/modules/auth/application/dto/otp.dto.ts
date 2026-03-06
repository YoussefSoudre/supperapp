import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({
    example: '+22675486914',
    description: '8 chiffres locaux (ex: 75486914) OU format E.164 (ex: +22675486914)',
  })
  @Matches(/^(\+226\d{8}|\d{8})$/, {
    message: 'phone must be 8 local digits (e.g. 75486914) or E.164 format +226XXXXXXXX',
  })
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    example: '+22675486914',
    description: '8 chiffres locaux (ex: 75486914) OU format E.164 (ex: +22675486914)',
  })
  @Matches(/^(\+226\d{8}|\d{8})$/, {
    message: 'phone must be 8 local digits (e.g. 75486914) or E.164 format +226XXXXXXXX',
  })
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

