import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

import { ListingBoostService } from './listing-boost.service';
import { SearchService } from '../search/search.service';

/** Expire boosts every 10 minutes so Meili ranking drops within ~15m AC. */
@Injectable()
export class ListingBoostExpireWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ListingBoostExpireWorker.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly boosts: ListingBoostService,
    private readonly search: SearchService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, 10 * 60_000);
    // Unref so the timer does not keep the process alive in tests.
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    try {
      const ids = await this.boosts.expireEnded();
      for (const id of ids) {
        await this.search.patchBoost(id, 0, false);
      }
      if (ids.length) this.logger.log(`expired ${ids.length} listing boost(s)`);
    } catch (err) {
      this.logger.warn(
        `boost expire worker: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
