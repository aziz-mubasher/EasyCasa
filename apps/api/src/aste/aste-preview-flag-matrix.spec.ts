import { describe, expect, it } from 'vitest';
import { ExecutionContext, NotFoundException } from '@nestjs/common';

import { AsteAnalysisEnabledGuard } from './aste-analysis.guard';
import { AsteMonetisationEnabledGuard } from './aste-monetisation.guard';
import { stripeSecretKeyIsLive } from './aste-access';

function ctx(email?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: email ? { sub: 'u1', email, roles: ['buyer'] } : undefined }),
    }),
  } as ExecutionContext;
}

const baseConfig = {
  ASTE_ANALYSIS_ENABLED: false,
  ASTE_INTERNAL_PREVIEW: false,
  ASTE_INTERNAL_PREVIEW_EMAILS: '',
  PAYMENTS_ENABLED: false,
  STRIPE_SECRET_KEY: '',
} as const;

describe('AsteAnalysisEnabledGuard (EC-36 flag matrix)', () => {
  it('404 when public off and preview off', () => {
    const guard = new AsteAnalysisEnabledGuard({ ...baseConfig } as never);
    expect(() => guard.canActivate(ctx('ops@easycasa.it'))).toThrow(NotFoundException);
    expect(() => guard.canActivate(ctx())).toThrow(NotFoundException);
  });

  it('allows when public on (ignores allowlist)', () => {
    const guard = new AsteAnalysisEnabledGuard({
      ...baseConfig,
      ASTE_ANALYSIS_ENABLED: true,
    } as never);
    expect(guard.canActivate(ctx('anyone@x.it'))).toBe(true);
  });

  it('preview on + allowlisted email passes', () => {
    const guard = new AsteAnalysisEnabledGuard({
      ...baseConfig,
      ASTE_INTERNAL_PREVIEW: true,
      ASTE_INTERNAL_PREVIEW_EMAILS: 'ops@easycasa.it',
    } as never);
    expect(guard.canActivate(ctx('ops@easycasa.it'))).toBe(true);
    expect(guard.canActivate(ctx('OPS@easycasa.it'))).toBe(true);
  });

  it('preview on + non-allowlisted or anonymous is dark (404)', () => {
    const guard = new AsteAnalysisEnabledGuard({
      ...baseConfig,
      ASTE_INTERNAL_PREVIEW: true,
      ASTE_INTERNAL_PREVIEW_EMAILS: 'ops@easycasa.it',
    } as never);
    expect(() => guard.canActivate(ctx('other@x.it'))).toThrow(NotFoundException);
    expect(() => guard.canActivate(ctx())).toThrow(NotFoundException);
  });
});

describe('AsteMonetisationEnabledGuard (EC-36)', () => {
  it('404 when payments off even if preview allowlisted', () => {
    const guard = new AsteMonetisationEnabledGuard({
      ...baseConfig,
      ASTE_INTERNAL_PREVIEW: true,
      ASTE_INTERNAL_PREVIEW_EMAILS: 'ops@easycasa.it',
      PAYMENTS_ENABLED: false,
    } as never);
    expect(() => guard.canActivate(ctx('ops@easycasa.it'))).toThrow(NotFoundException);
  });

  it('allows preview allowlisted user when payments on', () => {
    const guard = new AsteMonetisationEnabledGuard({
      ...baseConfig,
      ASTE_INTERNAL_PREVIEW: true,
      ASTE_INTERNAL_PREVIEW_EMAILS: 'ops@easycasa.it',
      PAYMENTS_ENABLED: true,
    } as never);
    expect(guard.canActivate(ctx('ops@easycasa.it'))).toBe(true);
  });
});

describe('stripeSecretKeyIsLive', () => {
  it('detects sk_live_', () => {
    expect(stripeSecretKeyIsLive('sk_live_abc')).toBe(true);
    expect(stripeSecretKeyIsLive('sk_test_abc')).toBe(false);
    expect(stripeSecretKeyIsLive('')).toBe(false);
  });
});

describe('asteCreditsCheckoutBlockedByLiveKey (EC-36)', () => {
  it('blocks live Stripe while public flag off', async () => {
    const { asteCreditsCheckoutBlockedByLiveKey } = await import('./aste-access');
    expect(
      asteCreditsCheckoutBlockedByLiveKey({
        ASTE_ANALYSIS_ENABLED: false,
        STRIPE_SECRET_KEY: 'sk_live_abc',
      } as never),
    ).toBe(true);
    expect(
      asteCreditsCheckoutBlockedByLiveKey({
        ASTE_ANALYSIS_ENABLED: false,
        STRIPE_SECRET_KEY: 'sk_test_abc',
      } as never),
    ).toBe(false);
    expect(
      asteCreditsCheckoutBlockedByLiveKey({
        ASTE_ANALYSIS_ENABLED: true,
        STRIPE_SECRET_KEY: 'sk_live_abc',
      } as never),
    ).toBe(false);
  });
});
