import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { FeaturedController } from './featured.controller';
import type { StripeService } from '../billing/stripe.service';
import type { UsersService } from '../users/users.service';
import type { ListingsRepository } from '../listings/listings.repository';
import type { ApiConfig } from '../config/load';
import type { AuthUser } from '../auth/auth.types';

function makeController(over: {
  flag?: boolean;
  listing?: Record<string, unknown> | null;
  meId?: string;
  url?: string;
}) {
  const stripe = {
    createFeaturedCheckout: vi.fn().mockResolvedValue(over.url ?? 'https://stripe/checkout'),
  } as unknown as StripeService;
  const users = {
    getOrCreate: vi.fn().mockResolvedValue({ id: over.meId ?? 'me' }),
  } as unknown as UsersService;
  const listings = {
    findById: vi.fn().mockResolvedValue(
      over.listing === undefined
        ? { id: 'l1', ownerUserId: 'me', agentId: null, status: 'published' }
        : over.listing,
    ),
  } as unknown as ListingsRepository;
  const config = { LISTING_BOOST_ENABLED: over.flag ?? true } as unknown as ApiConfig;
  return { controller: new FeaturedController(stripe, users, listings, config), stripe };
}

const seller: AuthUser = { sub: 'u', roles: ['seller'] };

describe('FeaturedController (T26 boost checkout)', () => {
  it('flag off ⇒ checkout refused with 404 (soft gate)', async () => {
    const { controller, stripe } = makeController({ flag: false });
    await expect(controller.checkout(seller, { listingId: 'l1', days: 7 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(stripe.createFeaturedCheckout).not.toHaveBeenCalled();
  });

  it('flag on + owner + published ⇒ returns Stripe checkout url', async () => {
    const { controller, stripe } = makeController({ flag: true });
    const res = await controller.checkout(seller, { listingId: 'l1', days: 30 });
    expect(res).toEqual({ url: 'https://stripe/checkout' });
    expect(stripe.createFeaturedCheckout).toHaveBeenCalledWith('l1', 30);
  });

  it('non-owner ⇒ 404 (does not leak listing existence)', async () => {
    const { controller } = makeController({
      flag: true,
      listing: { id: 'l1', ownerUserId: 'someone-else', agentId: null, status: 'published' },
    });
    await expect(controller.checkout(seller, { listingId: 'l1', days: 7 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('unpublished listing ⇒ 400 (must be published to boost)', async () => {
    const { controller } = makeController({
      flag: true,
      listing: { id: 'l1', ownerUserId: 'me', agentId: null, status: 'unpublished' },
    });
    await expect(controller.checkout(seller, { listingId: 'l1', days: 7 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
