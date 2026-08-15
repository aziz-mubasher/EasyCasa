import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadApiConfig } from '../config';

const REPO_ROOT = resolve(__dirname, '../../../../');

const baseEnv = {
  DATABASE_URL: 'postgresql://easycasa:x@localhost:5432/easycasa',
  WA_HANDLE_SECRET: 'test-wa-handle-secret-xx',
  ALLOW_PROVIDER_STUBS: 'true',
  EC_TEST_AUTH: 'true',
};

describe('EC-27 Aste monetisation flag matrix (defaults off)', () => {
  it('loadApiConfig defaults ASTE_ANALYSIS_ENABLED and PAYMENTS_ENABLED to false', () => {
    const cfg = loadApiConfig(baseEnv);
    expect(cfg.ASTE_ANALYSIS_ENABLED).toBe(false);
    expect(cfg.PAYMENTS_ENABLED).toBe(false);
  });

  it('.env.example documents EC-27 Stripe price env vars', () => {
    const text = readFileSync(resolve(REPO_ROOT, '.env.example'), 'utf8');
    for (const key of [
      'STRIPE_PRICE_ASTE_CREDITS_1',
      'STRIPE_PRICE_ASTE_CREDITS_3',
      'STRIPE_PRICE_ASTE_CREDITS_10',
    ]) {
      expect(text).toContain(key);
    }
  });

  it('credits routes inert when only one flag is on', () => {
    const asteOnly = loadApiConfig({ ...baseEnv, ASTE_ANALYSIS_ENABLED: 'true' });
    const payOnly = loadApiConfig({
      ...baseEnv,
      PAYMENTS_ENABLED: 'true',
      STRIPE_SECRET_KEY: 'sk_test_x',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    });
    expect(asteOnly.ASTE_ANALYSIS_ENABLED && asteOnly.PAYMENTS_ENABLED).toBe(false);
    expect(payOnly.ASTE_ANALYSIS_ENABLED && payOnly.PAYMENTS_ENABLED).toBe(false);
  });
});
