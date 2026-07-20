import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import type { HealthIndicator, IndicatorResult } from './health-indicator';
import { HealthIndicatorRegistry } from './health-indicator.registry';

@Injectable()
export class PostgresHealthIndicator implements HealthIndicator, OnModuleInit {
  readonly name = 'postgres';

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly registry: HealthIndicatorRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async check(): Promise<IndicatorResult> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return { name: this.name, up: true };
    } catch (err) {
      return { name: this.name, up: false, detail: String(err) };
    }
  }
}
