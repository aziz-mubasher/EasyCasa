import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { AstePipelineService } from './aste-pipeline.service';

/**
 * EC-23 — in-process setInterval worker (no @nestjs/schedule).
 * Active only when ASTE_ANALYSIS_ENABLED is true. Concurrency 1 via service lock.
 */
@Injectable()
export class AstePipelineScheduler implements OnModuleInit {
  private readonly logger = new Logger(AstePipelineScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly pipeline: AstePipelineService,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
  ) {}

  onModuleInit(): void {
    if (!this.config.ASTE_ANALYSIS_ENABLED) return;
    const ms = this.config.ASTE_PIPELINE_POLL_MS;
    void this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, ms);
    if (typeof this.timer.unref === 'function') this.timer.unref();
    this.logger.log(JSON.stringify({ event: 'aste.pipeline_scheduler_started', pollMs: ms }));
  }

  private async runOnce(): Promise<void> {
    try {
      await this.pipeline.tick();
    } catch (err) {
      this.logger.warn(
        JSON.stringify({
          event: 'aste.pipeline_tick_error',
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}
