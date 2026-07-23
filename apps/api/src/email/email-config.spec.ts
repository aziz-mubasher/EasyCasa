import { describe, expect, it } from 'vitest';

import type { ApiConfig } from '../config';
import {
  buildEmailConfigReport,
  emailHealthDetail,
  isEmailTransportConfigured,
  redactHttpProviderUrl,
  redactSmtpUrl,
  resolveEmailProviderKind,
} from './email-config';

const base = (over: Partial<ApiConfig>): ApiConfig =>
  ({
    NOTIFY_FROM: 'EasyCasa <no-reply@easycasaita.com>',
    SMTP_URL: '',
    EMAIL_PROVIDER_URL: '',
    ...over,
  }) as ApiConfig;

describe('email-config', () => {
  it('resolveEmailProviderKind: SMTP_URL -> smtp', () => {
    expect(resolveEmailProviderKind(base({ SMTP_URL: 'smtp://relay:587' }))).toBe('smtp');
  });

  it('resolveEmailProviderKind: EMAIL_PROVIDER_URL -> http when SMTP unset', () => {
    expect(
      resolveEmailProviderKind(base({ EMAIL_PROVIDER_URL: 'https://mail.example/send' })),
    ).toBe('http');
  });

  it('resolveEmailProviderKind: neither -> noop', () => {
    expect(resolveEmailProviderKind(base({}))).toBe('noop');
  });

  it('resolveEmailProviderKind: empty SMTP_URL -> noop', () => {
    expect(resolveEmailProviderKind(base({ SMTP_URL: '   ' }))).toBe('noop');
  });

  it('SMTP_URL takes precedence over EMAIL_PROVIDER_URL', () => {
    expect(
      resolveEmailProviderKind(
        base({
          SMTP_URL: 'smtp://relay:587',
          EMAIL_PROVIDER_URL: 'https://mail.example/send',
        }),
      ),
    ).toBe('smtp');
  });

  it('redactSmtpUrl hides credentials', () => {
    const redacted = redactSmtpUrl('smtp://user:secret@smtp-relay.brevo.com:587');
    expect(redacted).not.toContain('secret');
    expect(redacted).not.toContain('user');
    expect(redacted).toContain('smtp-relay.brevo.com');
    expect(redacted).toContain('587');
  });

  it('buildEmailConfigReport never includes raw credentials', () => {
    const report = buildEmailConfigReport(
      base({ SMTP_URL: 'smtp://apikey:xsmtpsib-deadbeef@smtp-relay.brevo.com:587' }),
    );
    expect(report.smtpUrlShape).not.toContain('xsmtpsib-deadbeef');
    expect(report.smtpUrlShape).not.toContain('apikey');
  });

  it('isEmailTransportConfigured is false for noop', () => {
    expect(isEmailTransportConfigured(base({}))).toBe(false);
  });

  it('emailHealthDetail describes noop without failing readiness semantics', () => {
    expect(emailHealthDetail(base({}))).toContain('noop');
    expect(emailHealthDetail(base({ SMTP_URL: 'smtp://relay:587' }))).toContain('smtp');
  });

  it('redactHttpProviderUrl strips query and credentials', () => {
    expect(redactHttpProviderUrl('https://user:pass@mail.example/send?key=abc')).toBe(
      'https://mail.example/send',
    );
  });
});
