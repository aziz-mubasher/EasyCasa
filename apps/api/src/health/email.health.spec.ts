import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ApiConfig } from '../config';

const base = (over: Partial<ApiConfig>): ApiConfig =>
  ({
    SMTP_URL: '',
    EMAIL_PROVIDER_URL: '',
    ...over,
  }) as ApiConfig;

let configStub = base({});

vi.mock('../config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config')>();
  return {
    ...actual,
    get apiConfig(): ApiConfig {
      return configStub;
    },
  };
});

import { EmailHealthIndicator } from './email.health';
import { HealthIndicatorRegistry } from './health-indicator.registry';

describe('EmailHealthIndicator', () => {
  afterEach(() => {
    configStub = base({});
    vi.clearAllMocks();
  });

  it('always reports up (informational — must not fail /health/ready)', async () => {
    configStub = base({});

    const indicator = new EmailHealthIndicator(new HealthIndicatorRegistry());
    const result = await indicator.check();

    expect(result.up).toBe(true);
    expect(result.name).toBe('email');
    expect(result.detail).toContain('noop');
  });

  it('reports smtp provider in detail when configured', async () => {
    configStub = base({ SMTP_URL: 'smtp://relay.brevo.com:587' });

    const indicator = new EmailHealthIndicator(new HealthIndicatorRegistry());
    const result = await indicator.check();

    expect(result.up).toBe(true);
    expect(result.detail).toContain('smtp');
    expect(result.detail).toContain('relay.brevo.com');
  });
});
