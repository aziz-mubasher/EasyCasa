import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { VerifiedOwnerEnabledGuard } from './verified-owner.guard';

describe('VerifiedOwnerEnabledGuard', () => {
  it('404 when VERIFIED_OWNER_ENABLED is false', () => {
    const guard = new VerifiedOwnerEnabledGuard({
      VERIFIED_OWNER_ENABLED: false,
    } as never);
    expect(() => guard.canActivate()).toThrow(NotFoundException);
  });

  it('allows when enabled', () => {
    const guard = new VerifiedOwnerEnabledGuard({
      VERIFIED_OWNER_ENABLED: true,
    } as never);
    expect(guard.canActivate()).toBe(true);
  });
});
