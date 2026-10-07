import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { ApiEnv } from '../config/env.js';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService<ApiEnv, true>) {
    this.client = new Redis(config.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
  }

  private async connectIfNeeded(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }

  async ping(): Promise<void> {
    await this.connectIfNeeded();

    const result = await this.client.ping();

    if (result !== 'PONG') {
      throw new Error(`Unexpected Redis PING response: ${String(result)}`);
    }
  }

  async incrementWithTtl(key: string, ttlSeconds: number): Promise<number> {
    await this.connectIfNeeded();
    const result = await this.client.eval(
      'local value = redis.call("INCR", KEYS[1]); if value == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]); end; return value',
      1,
      key,
      ttlSeconds.toString(),
    );
    const count = Number(result);
    if (!Number.isFinite(count)) {
      throw new Error('Unexpected Redis rate-limit response.');
    }
    return count;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') {
      this.client.disconnect();
    }
  }
}