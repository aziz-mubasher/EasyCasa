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

  /** Diagnostic CLI — exercises the same port/enquiry dispatch path as production mail. */
  sendDiagnosticTest(to: string): Promise<EmailResult> {
    const now = new Date().toISOString();
    return this.dispatch(to, {
      subject: 'EasyCasa email diagnostic test',
      text: `EasyCasa email diagnostic test sent at ${now}. If you received this, SMTP transport is working.`,
      html: `<p>EasyCasa email diagnostic test sent at <strong>${now}</strong>.</p><p>If you received this, SMTP transport is working.</p>`,
    });
  }
}
