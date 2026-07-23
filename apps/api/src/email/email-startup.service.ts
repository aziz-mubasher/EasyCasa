import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { isEmailTransportConfigured } from './email-config';

/**
 * Logs a prominent startup warning when production posture has no email transport.
 * Does not crash — email outage must not take the site down.
 */
@Injectable()
export class EmailStartupService implements OnModuleInit {
  private readonly logger = new Logger('EmailConfig');

  constructor(@InjectConfig() private readonly config: ApiConfig) {}

  onModuleInit(): void {
    if (this.config.DEV_AUTH) return;
    if (isEmailTransportConfigured(this.config)) return;

    this.logger.error(
      [
        'EMAIL MISCONFIGURED — ALL OUTBOUND EMAIL WILL BE DISCARDED.',
        'SMTP_URL and EMAIL_PROVIDER_URL are both unset or empty.',
        'Enquiry confirmations, owner notifications, viewing emails, and alerts will NOT be sent.',
        'Seekers will still see success screens while leads evaporate silently.',
        'Set SMTP_URL and NOTIFY_FROM in .env (quote NOTIFY_FROM if it contains spaces/angle brackets).',
        'Run: pnpm --filter @easycasa/api email:diagnostic',
      ].join(' '),
    );
  }
}
