import {
  IsString, IsNotEmpty, IsPhoneNumber, MinLength,
  IsOptional, IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Youssef' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Kaboré' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+22670000000' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({
    example: 'motdepasse123',
    minLength: 6,
    description: 'Mot de passe — min 6 caractères. Stocké hashé (bcrypt)',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'YOUS-K3P2X1', description: 'Code parrainage' })
  @IsOptional()
  @IsString()
  referralCode?: string;
}
