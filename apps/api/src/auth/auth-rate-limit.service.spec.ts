import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../config/env.js';
import type { RedisService } from '../redis/redis.service.js';
import { AuthRateLimitService } from './auth-rate-limit.service.js';

const config = new ConfigService<ApiEnv, true>({
  AUTH_LOGIN_RATE_LIMIT_MAX: 2,
  AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS: 600,
} as ApiEnv);

describe('AuthRateLimitService', () => {
  it('blocks attempts after the configured Redis-backed threshold', async () => {
    const incrementWithTtl = vi
      .fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);

    const redis = { incrementWithTtl } as unknown as RedisService;
    const service = new AuthRateLimitService(redis, config);

    await expect(
      service.consumeLogin('127.0.0.1', 'user@example.com'),
    ).resolves.toBeUndefined();

    await expect(
      service.consumeLogin('127.0.0.1', 'user@example.com'),
    ).resolves.toBeUndefined();

    try {
      await service.consumeLogin('127.0.0.1', 'user@example.com');
      throw new Error('Expected rate limit exception');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    expect(incrementWithTtl).toHaveBeenCalledWith(
      expect.stringMatching(/^auth:login:/),
      600,
    );
  });
});