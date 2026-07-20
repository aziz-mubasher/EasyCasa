import { Global, Module } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { EMAIL_PORT, type EmailPort } from './email-port';
import { EmailService } from './email.service';
import { HttpEmailProvider } from './providers/http-email.provider';
import { NoopEmailProvider } from './providers/noop-email.provider';
import { SmtpEmailProvider } from './providers/smtp-email.provider';

/**
 * Email module — Phase 36 / 36.1. Selects the provider from config:
 *   SMTP_URL set            → SmtpEmailProvider
 *   else EMAIL_PROVIDER_URL → HttpEmailProvider
 *   else                    → NoopEmailProvider (fail-soft)
 *
 * From-address uses `NOTIFY_FROM` (this repo's existing env name).
 */
export function selectEmailProvider(config: ApiConfig): EmailPort {
  const from = config.NOTIFY_FROM;
  if (config.SMTP_URL) return SmtpEmailProvider.fromUrl(config.SMTP_URL, from);
  if (config.EMAIL_PROVIDER_URL) {
    return new HttpEmailProvider(config.EMAIL_PROVIDER_URL, from);
  }
  return new NoopEmailProvider();
}

@Global()
@Module({
  providers: [
    { provide: EMAIL_PORT, useFactory: selectEmailProvider, inject: [APP_CONFIG] },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}
