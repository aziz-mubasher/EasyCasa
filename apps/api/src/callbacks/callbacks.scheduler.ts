import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { CallbacksService } from './callbacks.service';

/** Overdue owner + backup alerts. Once each. */
@Injectable()
export class CallbacksScheduler implements OnModuleInit {
  private readonly log = new Logger(CallbacksScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly callbacks: CallbacksService,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  onModuleInit(): void {
    if (this.config.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.callbacks.sweepOverdue().catch((err: unknown) => {
        this.log.warn(`overdue sweep failed: ${String(err)}`);
      });
    }, 5 * 60 * 1000);
  }
}
