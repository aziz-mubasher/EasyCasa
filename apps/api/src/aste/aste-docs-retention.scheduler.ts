import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { AsteAnalysisService } from './aste-analysis.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * EC-22 — daily purge of aged aste analyses + MinIO objects.
 * Retention days default 365 (COUNSEL PENDING — LGL-1).
 * No-ops when ASTE_ANALYSIS_ENABLED is false.
 */
@Injectable()
export class AsteDocsRetentionScheduler implements OnModuleInit {
  private readonly logger = new Logger(AsteDocsRetentionScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly analyses: AsteAnalysisService,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
  ) {}

  onModuleInit(): void {
    if (!this.config.ASTE_ANALYSIS_ENABLED) return;
    const days = this.config.ASTE_DOCS_RETENTION_DAYS;
    void this.runOnce(days);
    this.timer = setInterval(() => {
      void this.runOnce(days);
    }, DAY_MS);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  private async runOnce(days: number): Promise<void> {
    try {
      await this.analyses.purgeOlderThan(days);
    } catch (err) {
      this.logger.warn(
        `aste docs retention skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
