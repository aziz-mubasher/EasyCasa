import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { Public } from '../auth/public.decorator';
import type { IndicatorResult } from './health-indicator';
import { HealthIndicatorRegistry } from './health-indicator.registry';

/**
 * Liveness vs readiness — Phase 39.
 *  - /health/live  : process is up (no dependency checks) — for restart policies.
 *  - /health/ready : all dependencies reachable — for load-balancer/traffic gating.
 * Readiness returns 503 when any indicator is down, so a half-connected instance
 * is taken out of rotation instead of serving errors.
 */
@Controller('health')
export class ReadinessController {
  constructor(private readonly registry: HealthIndicatorRegistry) {}

  @Public()
  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  async ready(): Promise<{ status: 'ready'; checks: IndicatorResult[] }> {
    const checks = await Promise.all(
      this.registry.all().map(async (i) => {
        try {
          return await i.check();
        } catch (err) {
          return { name: i.name, up: false, detail: String(err) };
        }
      }),
    );
    if (checks.some((c) => !c.up)) {
      throw new ServiceUnavailableException({ status: 'not-ready', checks });
    }
    return { status: 'ready', checks };
  }
}
