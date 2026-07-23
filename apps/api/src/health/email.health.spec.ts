import { describe, expect, it } from 'vitest';

import { resetConfigCache } from '../config';
import { EmailHealthIndicator } from './email.health';
import { HealthIndicatorRegistry } from './health-indicator.registry';

describe('EmailHealthIndicator', () => {
  it('always reports up (informational — must not fail /health/ready)', async () => {
    process.env.SMTP_URL = '';
    process.env.EMAIL_PROVIDER_URL = '';
    resetConfigCache();

    const indicator = new EmailHealthIndicator(new HealthIndicatorRegistry());
    const result = await indicator.check();

    expect(result.up).toBe(true);
    expect(result.name).toBe('email');
    expect(result.detail).toContain('noop');
  });

  it('reports smtp provider in detail when configured', async () => {
    process.env.SMTP_URL = 'smtp://relay.brevo.com:587';
    process.env.EMAIL_PROVIDER_URL = '';
    resetConfigCache();

    const indicator = new EmailHealthIndicator(new HealthIndicatorRegistry());
    const result = await indicator.check();

    expect(result.up).toBe(true);
    expect(result.detail).toContain('smtp');
    expect(result.detail).toContain('relay.brevo.com');
  });
});
