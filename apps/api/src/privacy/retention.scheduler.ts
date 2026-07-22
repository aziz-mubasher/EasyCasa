import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { RetentionService } from './retention.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily retention purge for stale unconverted leads — Phase 38.
 * Soft-fails on boot (same posture as other optional onModuleInit work).
 */
@Injectable()
export class RetentionScheduler implements OnModuleInit {
  private readonly logger = new Logger(RetentionScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(RetentionService) private readonly retention: RetentionService,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
  ) {}

  onModuleInit(): void {
    const days = this.config.RETENTION_LEAD_DAYS;
    void this.runOnce(days);
    this.timer = setInterval(() => {
      void this.runOnce(days);
    }, DAY_MS);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  private async runOnce(days: number): Promise<void> {
    try {
      await this.retention.purgeStaleLeads(days);
    } catch (err) {
      this.logger.warn(
        `retention purge skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
