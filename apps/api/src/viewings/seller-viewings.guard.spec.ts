import { describe, expect, it } from 'vitest';

import { SellerViewingsEnabledGuard } from './seller-viewings.guard';

describe('SellerViewingsEnabledGuard', () => {
  it('404 when SELLER_VIEWINGS_ENABLED is false', () => {
    const guard = new SellerViewingsEnabledGuard({
      SELLER_VIEWINGS_ENABLED: false,
    } as never);
    expect(() => guard.canActivate()).toThrow();
  });

  it('allows when SELLER_VIEWINGS_ENABLED is true', () => {
    const guard = new SellerViewingsEnabledGuard({
      SELLER_VIEWINGS_ENABLED: true,
    } as never);
    expect(guard.canActivate()).toBe(true);
  });
});
