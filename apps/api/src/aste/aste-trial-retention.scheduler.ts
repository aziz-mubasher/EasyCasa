import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { AsteTrialService } from './aste-trial.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * EC-TRIAL-1 — rotate the IP-bucket salt every 30 days and drop counters
 * older than 90 days. Does not touch TrialGrant rows (account lifetime).
 */
@Injectable()
export class AsteTrialRetentionScheduler implements OnModuleInit {
  private readonly logger = new Logger(AsteTrialRetentionScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly trial: AsteTrialService) {}

  onModuleInit(): void {
    void this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, DAY_MS);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  private async runOnce(): Promise<void> {
    try {
      const rotated = await this.trial.rotateSaltIfDue();
      const dropped = await this.trial.dropExpiredCounters();
      this.logger.log(
        JSON.stringify({
          event: 'aste.trial_retention',
          rotated: rotated.rotated,
          dropped,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `aste trial retention skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
