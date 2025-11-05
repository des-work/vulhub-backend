import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './infrastructure/auth.controller';
import { AuthService } from './application/auth.service';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { LocalStrategy } from './infrastructure/local.strategy';
import { TokenBlacklistService } from '../../common/services/token-blacklist.service';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { UsersModule } from '../users/users.module';
import { MemoryCacheModule } from '../../adapters/cache/cache.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('app.jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    MemoryCacheModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy, 
    LocalStrategy,
    TokenBlacklistService,
    RateLimitGuard,
  ],
  exports: [AuthService, TokenBlacklistService, RateLimitGuard],
})
export class AuthModule {}
