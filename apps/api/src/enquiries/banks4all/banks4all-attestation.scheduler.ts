import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { Banks4AllAttestationSweep } from './banks4all-attestation.sweep';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Daily Banks4All attestation re-check — EC-1 (same posture as RetentionScheduler). */
@Injectable()
export class Banks4AllAttestationScheduler implements OnModuleInit {
  private readonly logger = new Logger(Banks4AllAttestationScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(@Inject(Banks4AllAttestationSweep) private readonly sweep: Banks4AllAttestationSweep) {}

  onModuleInit(): void {
    void this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, DAY_MS);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  private async runOnce(): Promise<void> {
    try {
      await this.sweep.runOnce();
    } catch (err) {
      this.logger.warn(
        `banks4all sweep skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
