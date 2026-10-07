import { createHash } from 'node:crypto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ApiEnv } from '../config/env.js';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class AuthRateLimitService {
  private readonly maxAttempts: number;
  private readonly windowSeconds: number;

  constructor(
    private readonly redis: RedisService,
    config: ConfigService<ApiEnv, true>,
  ) {
    this.maxAttempts = config.get('AUTH_LOGIN_RATE_LIMIT_MAX', {
      infer: true,
    });

    this.windowSeconds = config.get(
      'AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS',
      {
        infer: true,
      },
    );
  }

  async consumeLogin(ipAddress: string, email: string): Promise<void> {
    const identifier = createHash('sha256')
      .update(`${ipAddress}|${email.toLowerCase()}`)
      .digest('hex');

    const attempts = await this.redis.incrementWithTtl(
      `auth:login:${identifier}`,
      this.windowSeconds,
    );

    if (attempts > this.maxAttempts) {
      throw new HttpException(
        'Too many login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}