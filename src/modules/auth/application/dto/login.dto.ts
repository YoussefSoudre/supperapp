import { IsString, IsNotEmpty, IsPhoneNumber, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: '+22670000000',
    description: 'Numéro de téléphone au format international (E.164)',
  })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({
    example: 'motdepasse123',
    minLength: 6,
    description: 'Mot de passe (min 6 caractères)',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
