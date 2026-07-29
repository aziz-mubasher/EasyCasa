import { describe, expect, it } from 'vitest';

import { loadApiConfig, resetConfigCache } from './load';

describe('Stripe live-key guard', () => {
  it('refuses sk_live_ without GO_LIVE_PAYMENTS_ACK', () => {
    resetConfigCache();
    expect(() =>
      loadApiConfig({
        DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/db',
        ALLOW_PROVIDER_STUBS: 'true', EC_TEST_AUTH: 'true',
        STRIPE_SECRET_KEY: 'sk_live_abc',
        GO_LIVE_PAYMENTS_ACK: 'false',
      }),
    ).toThrow();
  });

  it('allows sk_test_ when PAYMENTS_ENABLED', () => {
    resetConfigCache();
    const cfg = loadApiConfig({
      DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/db',
      ALLOW_PROVIDER_STUBS: 'true', EC_TEST_AUTH: 'true',
      PAYMENTS_ENABLED: 'true',
      STRIPE_SECRET_KEY: 'sk_test_abc',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    });
    expect(cfg.PAYMENTS_ENABLED).toBe(true);
  });
});
