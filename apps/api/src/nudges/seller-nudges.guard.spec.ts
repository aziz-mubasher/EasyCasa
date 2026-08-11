import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import type { ApiConfig } from '../config';
import { SellerNudgesEnabledGuard } from './seller-nudges.guard';

describe('SellerNudgesEnabledGuard', () => {
  it('404 when SELLER_ANALYTICS_ENABLED is false', () => {
    const guard = new SellerNudgesEnabledGuard({
      SELLER_ANALYTICS_ENABLED: false,
    } as ApiConfig);
    expect(() => guard.canActivate()).toThrow(NotFoundException);
  });

  it('allows when SELLER_ANALYTICS_ENABLED is true', () => {
    const guard = new SellerNudgesEnabledGuard({
      SELLER_ANALYTICS_ENABLED: true,
    } as ApiConfig);
    expect(guard.canActivate()).toBe(true);
  });
});
