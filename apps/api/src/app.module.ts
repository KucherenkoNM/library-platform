import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env.js';
import { AuthModule } from './auth/auth.module.js';
import { BranchesModule } from './branches/branches.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RbacModule } from './rbac/rbac.module.js';
import { RedisModule } from './redis/redis.module.js';
import { StorageModule } from './storage/storage.module.js';
import { TenancyModule } from './tenancy/tenancy.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnv,
      cache: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            '*.password',
            '*.token',
            '*.refreshToken',
          ],
          censor: '[REDACTED]',
        },
      },
    }),
    PrismaModule,
    AuthModule,
    RedisModule,
    StorageModule,
    TenancyModule,
    RbacModule,
    BranchesModule,
    HealthModule,
  ],
})
export class AppModule {}
