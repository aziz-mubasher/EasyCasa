import { Injectable, OnModuleInit } from '@nestjs/common';

import { apiConfig } from '../config';
import type { HealthIndicator, IndicatorResult } from './health-indicator';
import { HealthIndicatorRegistry } from './health-indicator.registry';

@Injectable()
export class MeiliHealthIndicator implements HealthIndicator, OnModuleInit {
  readonly name = 'meili';

  constructor(private readonly registry: HealthIndicatorRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async check(): Promise<IndicatorResult> {
    const base = apiConfig.MEILI_URL.replace(/\/$/, '');
    try {
      const res = await fetch(`${base}/health`, {
        signal: AbortSignal.timeout(3_000),
      });
      if (!res.ok) {
        return { name: this.name, up: false, detail: `HTTP ${res.status}` };
      }
      return { name: this.name, up: true };
    } catch (err) {
      return { name: this.name, up: false, detail: String(err) };
    }
  }
}
