import { Logger } from '@nestjs/common';

import type { EmailMessage, EmailPort, EmailResult } from '../email-port';

/**
 * Fail-soft provider — used when neither SMTP_URL nor EMAIL_PROVIDER_URL is set.
 */
export class NoopEmailProvider implements EmailPort {
  private readonly logger = new Logger('EmailNoop');

  async send(msg: EmailMessage): Promise<EmailResult> {
    this.logger.warn(`email not configured — skipped "${msg.subject}" -> ${msg.to}`);
    return { provider: 'noop', delivered: false, skipped: true };
  }
}
