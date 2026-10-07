import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { StorageService } from '../storage/storage.service.js';

type DependencyState = 'up' | 'down';

type ReadyResponse = {
  status: 'ok';
  checks: {
    postgres: 'up';
    redis: 'up';
    objectStorage: 'up';
  };
};

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
  ) {}

  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  async ready(): Promise<ReadyResponse> {
    const [postgres, redis, objectStorage] = await Promise.allSettled([
      this.prisma.ping(),
      this.redis.ping(),
      this.storage.ping(),
    ]);

    const checks: Record<'postgres' | 'redis' | 'objectStorage', DependencyState> = {
      postgres: postgres.status === 'fulfilled' ? 'up' : 'down',
      redis: redis.status === 'fulfilled' ? 'up' : 'down',
      objectStorage: objectStorage.status === 'fulfilled' ? 'up' : 'down',
    };

    if (Object.values(checks).some((state) => state === 'down')) {
      throw new ServiceUnavailableException({
        status: 'error',
        checks,
      });
    }

    return {
      status: 'ok',
      checks: {
        postgres: 'up',
        redis: 'up',
        objectStorage: 'up',
      },
    };
  }
}
