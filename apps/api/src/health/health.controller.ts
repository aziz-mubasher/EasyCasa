import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@easycasa/shared';
import { Public } from '../auth/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): HealthStatus {
    return { status: 'ok', service: 'api', time: new Date().toISOString() };
  }
}
