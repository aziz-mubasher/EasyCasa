import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { whatsappInboundUnmatchedSenders } from '../observability/metrics';

const REFRESH_MS = 5 * 60 * 1000;
const QUERY_TIMEOUT_MS = 5_000;

/**
 * EC-19b — refresh unmatched-sender gauge (count only, never wa_id values).
 * Trend signal: a jump after deploy often means a write path stopped normalising.
 */
@Injectable()
export class WhatsAppUnmatchedSendersGauge
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger(WhatsAppUnmatchedSendersGauge.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  onModuleInit(): void {
    // Skip in unit/boot tests — no real Postgres; a hanging connect would block app.init.
    if (this.config.NODE_ENV === 'test' || this.config.EC_TEST_AUTH === true) {
      return;
    }
    this.timer = setInterval(() => {
      void this.refresh();
    }, REFRESH_MS);
    this.timer.unref?.();
    void this.refresh();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async refresh(): Promise<void> {
    try {
      const result = await Promise.race([
        this.db.execute(sql`
          SELECT COUNT(*)::int AS c
          FROM (
            SELECT DISTINCT w.wa_id
            FROM wa_inbound_messages w
            LEFT JOIN users u ON u.phone_e164 = w.wa_id
            WHERE u.id IS NULL
          ) t
        `),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('unmatched gauge query timeout')), QUERY_TIMEOUT_MS);
        }),
      ]);
      const row = result.rows[0] as { c: number } | undefined;
      whatsappInboundUnmatchedSenders.set(Number(row?.c ?? 0));
    } catch (err) {
      this.log.warn(
        `unmatched senders gauge refresh failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
