import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness probe' })
  @ApiResponse({ status: 200, description: 'API process is alive.' })
  live(): { status: 'ok' } {
    return this.health.live();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Infrastructure readiness probe' })
  @ApiResponse({ status: 200, description: 'PostgreSQL, Redis and object storage are reachable.' })
  @ApiResponse({ status: 503, description: 'At least one required dependency is unavailable.' })
  ready() {
    return this.health.ready();
  }
}
