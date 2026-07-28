import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { ViewingNotifier, ViewingRepository } from './domain/ports';
import { VIEWING_NOTIFIER, VIEWING_REPOSITORY } from './viewings.service';

const HOUR_MS = 60 * 60 * 1000;
const INTERVAL_MS = 15 * 60 * 1000;

/**
 * Fires 24h / 2h viewing reminders for CONFIRMED bookings.
 * Idempotent via reminder_*_sent_at columns on the viewings row.
 */
@Injectable()
export class ViewingsReminderScheduler implements OnModuleInit {
  private readonly logger = new Logger(ViewingsReminderScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(VIEWING_REPOSITORY) private readonly viewings: ViewingRepository,
    @Inject(VIEWING_NOTIFIER) private readonly notifier: ViewingNotifier,
  ) {}

  onModuleInit(): void {
    void this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, INTERVAL_MS);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  private async runOnce(): Promise<void> {
    try {
      await this.fireReminders('24h', 23 * HOUR_MS, 25 * HOUR_MS);
      await this.fireReminders('2h', 1.5 * HOUR_MS, 2.5 * HOUR_MS);
    } catch (err) {
      this.logger.warn(
        `viewing reminders skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async fireReminders(
    kind: '24h' | '2h',
    windowStartOffsetMs: number,
    windowEndOffsetMs: number,
  ): Promise<void> {
    const now = Date.now();
    const due = await this.viewings.listDueReminders(
      kind,
      now + windowStartOffsetMs,
      now + windowEndOffsetMs,
    );
    for (const viewing of due) {
      try {
        await this.notifier.notify(
          viewing.seekerUserId,
          viewing,
          kind === '24h' ? 'reminder24h' : 'reminder2h',
        );
        await this.viewings.markReminderSent(viewing.id, kind);
      } catch (err) {
        this.logger.warn(
          `reminder ${kind} failed viewing=${viewing.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
