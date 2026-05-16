import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({
    example: 'admin@superapp.bf',
    description: 'Email de l\'administrateur',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'motdepasse123',
    minLength: 6,
    description: 'Mot de passe (min 6 caractères)',
  })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'admin@superapp.bf',
    description: 'Email de l\'administrateur',
  })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'abc123-token-xyz',
    description: 'Token de réinitialisation reçu par email',
  })
  @IsString()
  token!: string;

  @ApiProperty({
    example: 'nouveauMotDePasse123',
    minLength: 6,
    description: 'Nouveau mot de passe (min 6 caractères)',
  })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class AdminAuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  refresh_token!: string;

  @ApiProperty({ example: 900, description: 'Token expiration in seconds' })
  expires_in!: number;

  @ApiProperty({
    example: {
      id: 'uuid',
      email: 'admin@superapp.bf',
      first_name: 'Admin',
      last_name: 'User',
      roles: ['super_admin'],
      permissions: ['admin:*'],
    },
  })
  user!: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    roles: string[];
    permissions: string[];
  };
}
