import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './presentation/auth.controller';
import { AuthService } from './application/auth.service';
import { TokenService } from './application/services/token.service';
import { OtpService } from './application/services/otp.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { User } from '../users/domain/entities/user.entity';
import { RedisModule } from '../../infrastructure/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        // Access token : 15 min en prod, configurable
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') as string },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, OtpService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
