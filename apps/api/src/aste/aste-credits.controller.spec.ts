import { describe, expect, it } from 'vitest';

import { AsteCreditsController } from './aste-credits.controller';
import { AsteMonetisationEnabledGuard } from './aste-monetisation.guard';

describe('AsteCreditsController flag gating', () => {
  it('AsteMonetisationEnabledGuard returns 404 when flags off', () => {
    const guard = new AsteMonetisationEnabledGuard({
      ASTE_ANALYSIS_ENABLED: false,
      PAYMENTS_ENABLED: false,
    } as never);
    expect(() => guard.canActivate()).toThrow();
  });

  it('AsteMonetisationEnabledGuard passes when both flags on', () => {
    const guard = new AsteMonetisationEnabledGuard({
      ASTE_ANALYSIS_ENABLED: true,
      PAYMENTS_ENABLED: true,
    } as never);
    expect(guard.canActivate()).toBe(true);
  });

  it('controller class exists for credits routes', () => {
    expect(AsteCreditsController).toBeDefined();
  });
});
