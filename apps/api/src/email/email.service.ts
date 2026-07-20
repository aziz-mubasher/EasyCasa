import { Inject, Injectable, Logger } from '@nestjs/common';

import { EMAIL_PORT, type EmailPort, type EmailResult } from './email-port';
import * as t from './templates/templates';

/**
 * Feature-facing email API — Phase 36. Best-effort: provider failures are
 * logged and swallowed so notifications never break the primary request.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(@Inject(EMAIL_PORT) private readonly port: EmailPort) {}

  private async dispatch(to: string, r: t.Rendered): Promise<EmailResult> {
    try {
      return await this.port.send({ to, subject: r.subject, text: r.text, html: r.html });
    } catch (err) {
      this.logger.error(`send failed "${r.subject}" -> ${to}: ${String(err)}`);
      return { provider: 'noop', delivered: false };
    }
  }

  enquiryReceivedSeeker(to: string, p: t.EnquirySeekerParams, locale?: t.Locale) {
    return this.dispatch(to, t.enquiryReceivedSeeker(p, locale));
  }
  enquiryReceivedOwner(to: string, p: t.EnquiryOwnerParams, locale?: t.Locale) {
    return this.dispatch(to, t.enquiryReceivedOwner(p, locale));
  }
  viewingConfirmed(to: string, p: t.ViewingConfirmedParams, locale?: t.Locale) {
    return this.dispatch(to, t.viewingConfirmed(p, locale));
  }
  savedSearchAlert(to: string, p: t.SavedSearchAlertParams, locale?: t.Locale) {
    return this.dispatch(to, t.savedSearchAlert(p, locale));
  }
}
