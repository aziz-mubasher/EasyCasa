import { describe, expect, it } from 'vitest';

import type { ApiConfig } from '../config';
import { EmailHealthIndicator } from './email.health';
import { HealthIndicatorRegistry } from './health-indicator.registry';

const stubConfig = (over: Partial<ApiConfig> = {}): ApiConfig =>
  ({
    SMTP_URL: '',
    EMAIL_PROVIDER_URL: '',
    NOTIFY_FROM: 'EasyCasa <no-reply@easycasaita.com>',
    ...over,
  }) as ApiConfig;

describe('EmailHealthIndicator', () => {
  it('always reports up (informational — must not fail /health/ready)', async () => {
    const indicator = new EmailHealthIndicator(
      new HealthIndicatorRegistry(),
      stubConfig({ SMTP_URL: '', EMAIL_PROVIDER_URL: '' }),
    );
    const result = await indicator.check();

    expect(result.up).toBe(true);
    expect(result.name).toBe('email');
    expect(result.detail).toContain('noop');
  });

  it('reports smtp provider in detail when configured', async () => {
    const indicator = new EmailHealthIndicator(
      new HealthIndicatorRegistry(),
      stubConfig({ SMTP_URL: 'smtp://relay.brevo.com:587', EMAIL_PROVIDER_URL: '' }),
    );
    const result = await indicator.check();

    expect(result.up).toBe(true);
    expect(result.detail).toContain('smtp');
    expect(result.detail).toContain('relay.brevo.com');
  });
});
