import { Module, Scope } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RbacModule } from '../rbac/rbac.module.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthRateLimitService } from './auth-rate-limit.service.js';
import { AuthService } from './auth.service.js';
import { OneTimeTokenService } from './one-time-token.service.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [RbacModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRateLimitService,
    PasswordService,
    TokenService,
    OneTimeTokenService,
    {
      provide: APP_GUARD,
      scope: Scope.REQUEST,
      useClass: AccessTokenGuard,
    },
  ],
  exports: [PasswordService, TokenService, OneTimeTokenService],
})
export class AuthModule {}