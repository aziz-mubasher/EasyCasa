import { Injectable, OnModuleInit } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { emailHealthDetail } from '../email/email-config';
import type { HealthIndicator, IndicatorResult } from './health-indicator';
import { HealthIndicatorRegistry } from './health-indicator.registry';

/**
 * Email configuration readiness — informational only.
 *
 * Always reports `up: true` so /health/ready never 503s over a non-critical
 * dependency. Misconfigured email (noop provider) is visible in `detail` for
 * operators and log scrapers without removing the instance from rotation.
 */
@Injectable()
export class EmailHealthIndicator implements HealthIndicator, OnModuleInit {
  readonly name = 'email';

  constructor(
    private readonly registry: HealthIndicatorRegistry,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async check(): Promise<IndicatorResult> {
    return {
      name: this.name,
      up: true,
      detail: emailHealthDetail(this.config),
    };
  }
}
