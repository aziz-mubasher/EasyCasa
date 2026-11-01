import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { addDays, romeDay, romeMinutes } from '@easycasa/shared';

import { RollupService } from './rollup.service';

const FIFTEEN_MIN = 15 * 60 * 1000;

@Injectable()
export class RollupScheduler implements OnModuleInit {
  private readonly log = new Logger(RollupScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRetentionDay: string | null = null;

  constructor(@Inject(RollupService) private readonly rollup: RollupService) {}

  onModuleInit(): void {
    void this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, FIFTEEN_MIN);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  private async tick(): Promise<void> {
    const today = romeDay();
    try {
      await this.rollup.recompute(today);
      await this.rollup.recompute(addDays(today, -1));
    } catch (err) {
      this.log.warn(`analytics rollup skipped: ${err instanceof Error ? err.name : 'error'}`);
    }
    const minutes = romeMinutes();
    if (minutes >= 3 * 60 + 30 && minutes < 3 * 60 + 45 && this.lastRetentionDay !== today) {
      this.lastRetentionDay = today;
      try {
        await this.rollup.retain(today);
      } catch {
        this.log.warn('analytics retention skipped');
      }
    }
  }
}
