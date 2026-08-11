import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { SellerInboxEnabledGuard } from './seller-inbox.guard';

describe('SellerInboxEnabledGuard', () => {
  it('allows when SELLER_INBOX_ENABLED is true', () => {
    const guard = new SellerInboxEnabledGuard({ SELLER_INBOX_ENABLED: true } as never);
    expect(guard.canActivate()).toBe(true);
  });

  it('404 when flag is off', () => {
    const guard = new SellerInboxEnabledGuard({ SELLER_INBOX_ENABLED: false } as never);
    expect(() => guard.canActivate()).toThrow(NotFoundException);
  });
});
