import type { ApiConfig } from '../config';

export type EmailProviderKind = 'smtp' | 'http' | 'noop';

export interface EmailConfigReport {
  provider: EmailProviderKind;
  smtpUrlSet: boolean;
  smtpUrlShape?: string;
  emailProviderUrlSet: boolean;
  emailProviderUrlShape?: string;
  notifyFromSet: boolean;
  notifyFromShape?: string;
}

/** Which provider {@link selectEmailProvider} would choose from config alone. */
export function resolveEmailProviderKind(config: ApiConfig): EmailProviderKind {
  if (config.SMTP_URL?.trim()) return 'smtp';
  if (config.EMAIL_PROVIDER_URL?.trim()) return 'http';
  return 'noop';
}

/** True when a real transport is configured (not NoopEmailProvider). */
export function isEmailTransportConfigured(config: ApiConfig): boolean {
  return resolveEmailProviderKind(config) !== 'noop';
}

/** Redact credentials from an SMTP URL — safe for logs and CLI output. */
export function redactSmtpUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '(unset)';
  try {
    const parsed = new URL(trimmed);
    if (parsed.username) parsed.username = '***';
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '(invalid URL — check SMTP_URL format)';
  }
}

/** Redact an HTTP provider URL — keep origin/path, drop query secrets if any. */
export function redactHttpProviderUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '(unset)';
  try {
    const parsed = new URL(trimmed);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '(invalid URL — check EMAIL_PROVIDER_URL format)';
  }
}

/** Summarize NOTIFY_FROM without treating it as a secret. */
export function describeNotifyFrom(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '(unset)';
  return trimmed;
}

/** Full diagnostic report for env presence/shape — never includes secrets. */
export function buildEmailConfigReport(config: ApiConfig): EmailConfigReport {
  const smtpUrl = config.SMTP_URL?.trim() ?? '';
  const httpUrl = config.EMAIL_PROVIDER_URL?.trim() ?? '';
  const notifyFrom = config.NOTIFY_FROM?.trim() ?? '';
  const provider = resolveEmailProviderKind(config);

  return {
    provider,
    smtpUrlSet: Boolean(smtpUrl),
    smtpUrlShape: smtpUrl ? redactSmtpUrl(smtpUrl) : undefined,
    emailProviderUrlSet: Boolean(httpUrl),
    emailProviderUrlShape: httpUrl ? redactHttpProviderUrl(httpUrl) : undefined,
    notifyFromSet: Boolean(notifyFrom),
    notifyFromShape: notifyFrom ? describeNotifyFrom(notifyFrom) : undefined,
  };
}

/** One-line summary for readiness / health indicators. */
export function emailHealthDetail(config: ApiConfig): string {
  const report = buildEmailConfigReport(config);
  if (report.provider === 'noop') {
    return 'provider: noop — SMTP_URL and EMAIL_PROVIDER_URL unset; outbound email discarded';
  }
  if (report.provider === 'smtp') {
    return `provider: smtp — ${report.smtpUrlShape ?? '(shape unknown)'}`;
  }
  return `provider: http — ${report.emailProviderUrlShape ?? '(shape unknown)'}`;
}
