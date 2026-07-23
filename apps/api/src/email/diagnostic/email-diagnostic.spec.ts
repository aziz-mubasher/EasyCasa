import { describe, expect, it } from 'vitest';

import type { ApiConfig } from '../../config';
import type { EmailResult } from '../email-port';
import {
  formatEmailDiagnosticLines,
  resolveDiagnosticRecipient,
  runEmailDiagnostic,
} from './email-diagnostic';

const base = (over: Partial<ApiConfig>): ApiConfig =>
  ({
    NOTIFY_FROM: 'EasyCasa <no-reply@easycasaita.com>',
    SMTP_URL: '',
    EMAIL_PROVIDER_URL: '',
    ...over,
  }) as ApiConfig;

describe('email diagnostic CLI logic', () => {
  it('resolveDiagnosticRecipient prefers argv over env', () => {
    expect(resolveDiagnosticRecipient(['node', 'cli.js', 'a@b.it'], { EMAIL_DIAGNOSTIC_TO: 'c@d.it' })).toBe(
      'a@b.it',
    );
  });

  it('resolveDiagnosticRecipient falls back to EMAIL_DIAGNOSTIC_TO', () => {
    expect(resolveDiagnosticRecipient(['node', 'cli.js'], { EMAIL_DIAGNOSTIC_TO: 'c@d.it' })).toBe('c@d.it');
  });

  it('exits non-zero when provider is noop', async () => {
    const outcome = await runEmailDiagnostic({
      config: base({}),
      sendTest: async () => ({ provider: 'noop', delivered: false, skipped: true }),
    });
    expect(outcome.exitCode).toBe(1);
    expect(outcome.report.provider).toBe('noop');
  });

  it('exits zero when SMTP configured and no recipient', async () => {
    const outcome = await runEmailDiagnostic({
      config: base({ SMTP_URL: 'smtp://relay:587' }),
      sendTest: async () => ({ provider: 'smtp', delivered: true }),
    });
    expect(outcome.exitCode).toBe(0);
    expect(outcome.report.provider).toBe('smtp');
  });

  it('sends test via injected sendTest and exits zero on delivery', async () => {
    const sent: string[] = [];
    const outcome = await runEmailDiagnostic(
      {
        config: base({ SMTP_URL: 'smtp://relay:587' }),
        sendTest: async (to) => {
          sent.push(to);
          return { provider: 'smtp', delivered: true, id: 'msg-1' } satisfies EmailResult;
        },
      },
      'ops@example.com',
    );
    expect(outcome.exitCode).toBe(0);
    expect(sent).toEqual(['ops@example.com']);
    expect(outcome.send?.ok).toBe(true);
  });

  it('exits non-zero when test send throws', async () => {
    const outcome = await runEmailDiagnostic(
      {
        config: base({ SMTP_URL: 'smtp://relay:587' }),
        sendTest: async () => {
          throw new Error('connection refused');
        },
      },
      'ops@example.com',
    );
    expect(outcome.exitCode).toBe(1);
    expect(outcome.send?.error).toContain('connection refused');
  });

  it('formatEmailDiagnosticLines marks noop as FAIL', () => {
    const lines = formatEmailDiagnosticLines({
      report: {
        provider: 'noop',
        smtpUrlSet: false,
        emailProviderUrlSet: false,
        notifyFromSet: true,
        notifyFromShape: 'EasyCasa <no-reply@easycasaita.com>',
      },
      exitCode: 1,
    });
    expect(lines.join('\n')).toContain('noop');
    expect(lines.join('\n')).toContain('FAIL');
  });
});
