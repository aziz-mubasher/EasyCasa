import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { SellerNudgesService } from './seller-nudges.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * EC-S-T24 — nightly nudge evaluation (OnModuleInit + setInterval;
 * same posture as Banks4AllAttestationScheduler / ViewingsReminderScheduler).
 * No Nest @Cron in this repo.
 */
@Injectable()
export class SellerNudgesScheduler implements OnModuleInit {
  private readonly logger = new Logger(SellerNudgesScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
    @Inject(SellerNudgesService) private readonly nudges: SellerNudgesService,
  ) {}

  onModuleInit(): void {
    void this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, DAY_MS);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  private async runOnce(): Promise<void> {
    if (!this.config.SELLER_ANALYTICS_ENABLED) {
      this.logger.debug('seller nudges sweep skipped (SELLER_ANALYTICS_ENABLED=false)');
      return;
    }
    try {
      const ids = await this.nudges.listActivePublishedListingIds();
      let emitted = 0;
      for (const id of ids) {
        try {
          const codes = await this.nudges.evaluateAndPersist(id);
          emitted += codes.length;
        } catch (err) {
          this.logger.warn(
            `nudge evaluate failed listing=${id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
      this.logger.log(
        `seller nudges sweep: listings=${ids.length} newEmissions=${emitted}`,
      );
    } catch (err) {
      this.logger.warn(
        `seller nudges sweep skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
