import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { AsteCreditsController } from './aste-credits.controller';
import { AsteMonetisationEnabledGuard } from './aste-monetisation.guard';

const ctx = (email = 'ops@easycasa.it') =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user: { sub: 'u1', email, roles: ['buyer'] } }),
    }),
  }) as never;

describe('AsteCreditsController flag gating', () => {
  it('AsteMonetisationEnabledGuard returns 404 when flags off', () => {
    const guard = new AsteMonetisationEnabledGuard({
      ASTE_ANALYSIS_ENABLED: false,
      ASTE_INTERNAL_PREVIEW: false,
      ASTE_INTERNAL_PREVIEW_EMAILS: '',
      PAYMENTS_ENABLED: false,
    } as never);
    expect(() => guard.canActivate(ctx())).toThrow(NotFoundException);
  });

  it('AsteMonetisationEnabledGuard passes when public + payments on', () => {
    const guard = new AsteMonetisationEnabledGuard({
      ASTE_ANALYSIS_ENABLED: true,
      ASTE_INTERNAL_PREVIEW: false,
      ASTE_INTERNAL_PREVIEW_EMAILS: '',
      PAYMENTS_ENABLED: true,
    } as never);
    expect(guard.canActivate(ctx())).toBe(true);
  });

  it('controller class exists for credits routes', () => {
    expect(AsteCreditsController).toBeDefined();
  });
});
