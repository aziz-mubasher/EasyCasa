import { Injectable } from '@nestjs/common';

import type { HealthIndicator } from './health-indicator';

/**
 * Collects HealthIndicator plug-ins without Nest `multi` providers
 * (same pattern as PersonalDataRegistry — Phase 38).
 */
@Injectable()
export class HealthIndicatorRegistry {
  private readonly indicators: HealthIndicator[] = [];

  register(indicator: HealthIndicator): void {
    this.indicators.push(indicator);
  }

  all(): HealthIndicator[] {
    return [...this.indicators];
  }
}
