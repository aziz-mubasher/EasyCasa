import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { SellerOnboardingEnabledGuard } from './seller-onboarding.guard';
import { SellerService } from './seller.service';

describe('SellerOnboardingEnabledGuard', () => {
  it('404 when SELLER_ONBOARDING_ENABLED is false', () => {
    const guard = new SellerOnboardingEnabledGuard({
      SELLER_ONBOARDING_ENABLED: false,
    } as never);
    expect(() => guard.canActivate()).toThrow(NotFoundException);
  });

  it('allows when enabled', () => {
    const guard = new SellerOnboardingEnabledGuard({
      SELLER_ONBOARDING_ENABLED: true,
    } as never);
    expect(guard.canActivate()).toBe(true);
  });
});

describe('SellerService.completeOnboarding', () => {
  it('refuses insert when INFORMATIVA_SELLER_VERSION is unset', async () => {
    const svc = new SellerService(
      { insert: vi.fn(), select: vi.fn(), update: vi.fn() } as never,
      { INFORMATIVA_SELLER_VERSION: '' } as never,
      { record: vi.fn() } as never,
    );
    await expect(
      svc.completeOnboarding({ userId: 'u1', displayName: 'Ada' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
