import { describe, expect, it, vi, afterEach } from 'vitest';

import { asteMonetisationEnabled } from './aste-monetisation-config';

describe('asteMonetisationEnabled (EC-27 dual flag)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('false when either build-time flag is off', () => {
    vi.stubEnv('NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_PAYMENTS_ENABLED', 'false');
    expect(asteMonetisationEnabled()).toBe(false);
  });

  it('true when public analysis + payments are on', () => {
    vi.stubEnv('NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_PAYMENTS_ENABLED', 'true');
    expect(asteMonetisationEnabled()).toBe(true);
  });

  it('true for preview route mount + payments (EC-36)', () => {
    vi.stubEnv('NEXT_PUBLIC_ASTE_ANALYSIS_ENABLED', 'false');
    vi.stubEnv('NEXT_PUBLIC_ASTE_INTERNAL_PREVIEW', 'true');
    vi.stubEnv('NEXT_PUBLIC_PAYMENTS_ENABLED', 'true');
    expect(asteMonetisationEnabled()).toBe(true);
  });
});
