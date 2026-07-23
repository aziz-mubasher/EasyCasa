import type { ApiConfig } from '../../config';
import type { EmailResult } from '../email-port';
import {
  buildEmailConfigReport,
  isEmailTransportConfigured,
  type EmailConfigReport,
} from '../email-config';

export interface EmailDiagnosticSendResult {
  ok: boolean;
  result?: EmailResult;
  error?: string;
}

export interface EmailDiagnosticOutcome {
  report: EmailConfigReport;
  exitCode: number;
  send?: EmailDiagnosticSendResult;
}

export interface EmailDiagnosticDeps {
  config: ApiConfig;
  sendTest: (to: string) => Promise<EmailResult>;
}

/** Resolve recipient from argv[2] or EMAIL_DIAGNOSTIC_TO env var. */
export function resolveDiagnosticRecipient(
  argv: string[],
  env: NodeJS.ProcessEnv,
): string | undefined {
  const fromArg = argv[2]?.trim();
  if (fromArg) return fromArg;
  const fromEnv = env.EMAIL_DIAGNOSTIC_TO?.trim();
  return fromEnv || undefined;
}

/** Core diagnostic logic — testable without booting Nest. */
export async function runEmailDiagnostic(
  deps: EmailDiagnosticDeps,
  recipient?: string,
): Promise<EmailDiagnosticOutcome> {
  const report = buildEmailConfigReport(deps.config);
  const configured = isEmailTransportConfigured(deps.config);

  if (!configured) {
    return { report, exitCode: 1 };
  }

  if (!recipient) {
    return { report, exitCode: 0 };
  }

  try {
    const result = await deps.sendTest(recipient);
    if (!result.delivered) {
      return {
        report,
        exitCode: 1,
        send: { ok: false, result, error: 'provider reported not delivered' },
      };
    }
    return {
      report,
      exitCode: 0,
      send: { ok: true, result },
    };
  } catch (err) {
    return {
      report,
      exitCode: 1,
      send: { ok: false, error: String(err) },
    };
  }
}

/** Human-readable CLI lines — credentials never included. */
export function formatEmailDiagnosticLines(outcome: EmailDiagnosticOutcome): string[] {
  const { report, send } = outcome;
  const lines: string[] = [
    `Active provider: ${report.provider}`,
    `SMTP_URL set: ${report.smtpUrlSet}${report.smtpUrlShape ? ` (${report.smtpUrlShape})` : ''}`,
    `EMAIL_PROVIDER_URL set: ${report.emailProviderUrlSet}${
      report.emailProviderUrlShape ? ` (${report.emailProviderUrlShape})` : ''
    }`,
    `NOTIFY_FROM set: ${report.notifyFromSet}${report.notifyFromShape ? ` (${report.notifyFromShape})` : ''}`,
  ];

  if (report.provider === 'noop') {
    lines.push('FAIL — noop provider active; configure SMTP_URL or EMAIL_PROVIDER_URL before deploy.');
    return lines;
  }

  if (!send) {
    lines.push('OK — real email provider configured (no test recipient; pass address as argv or EMAIL_DIAGNOSTIC_TO).');
    return lines;
  }

  if (send.ok && send.result) {
    lines.push(
      `OK — test email delivered via ${send.result.provider}${
        send.result.id ? ` (messageId: ${send.result.id})` : ''
      }`,
    );
    return lines;
  }

  lines.push(`FAIL — test email not delivered${send.error ? `: ${send.error}` : ''}`);
  if (send.result) {
    lines.push(`Provider response: provider=${send.result.provider}, delivered=${send.result.delivered}`);
  }
  return lines;
}
