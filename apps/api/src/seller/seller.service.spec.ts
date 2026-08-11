import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

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

  it('refuses insert when INFORMATIVA_SELLER_VERSION is malformed (v1-draft)', async () => {
    const svc = new SellerService(
      { insert: vi.fn(), select: vi.fn(), update: vi.fn() } as never,
      { INFORMATIVA_SELLER_VERSION: 'v1-draft' } as never,
      { record: vi.fn() } as never,
    );
    await expect(
      svc.completeOnboarding({ userId: 'u1', displayName: 'Ada' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SellerService.consentStatus / assertFeatureEntryAllowed', () => {
  it('notice is non-blocking; major bump blocks', async () => {
    const select = vi.fn().mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              userId: 'u1',
              displayName: 'Ada',
              phone: null,
              informativaVersionAccepted: 'v1.0',
              acceptedAt: new Date(),
              marketingConsent: false,
            },
          ],
        }),
      }),
    });
    const svcMinor = new SellerService(
      { select } as never,
      { INFORMATIVA_SELLER_VERSION: 'v1.1' } as never,
      { record: vi.fn() } as never,
    );
    const notice = svcMinor.consentStatus('v1.0');
    expect(notice.decision).toBe('notice');
    expect(notice.mayProceed).toBe(true);
    await expect(svcMinor.assertFeatureEntryAllowed('u1')).resolves.toBeUndefined();

    const svcMajor = new SellerService(
      { select } as never,
      { INFORMATIVA_SELLER_VERSION: 'v2.0' } as never,
      { record: vi.fn() } as never,
    );
    await expect(svcMajor.assertFeatureEntryAllowed('u1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
