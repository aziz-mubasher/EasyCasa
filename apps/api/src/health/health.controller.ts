import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@easycasa/shared';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthStatus {
    return { status: 'ok', service: 'api', time: new Date().toISOString() };
  }
}
