import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { VerifiedOwnerService } from './verified-owner.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Daily VO EXPIRE sweep — EC-S-T14 (UTC Date comparisons, DST-safe). */
@Injectable()
export class VerifiedOwnerExpireScheduler implements OnModuleInit {
  private readonly logger = new Logger(VerifiedOwnerExpireScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(@Inject(VerifiedOwnerService) private readonly vo: VerifiedOwnerService) {}

  onModuleInit(): void {
    void this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, DAY_MS);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  private async runOnce(): Promise<void> {
    try {
      const n = await this.vo.expireDue();
      if (n > 0) this.logger.log(`VO expire sweep: expired=${n}`);
    } catch (err) {
      this.logger.warn(
        `VO expire sweep skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
