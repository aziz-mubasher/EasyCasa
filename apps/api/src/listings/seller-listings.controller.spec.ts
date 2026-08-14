import { describe, expect, it, vi } from 'vitest';

import { SellerListingsController } from './seller-listings.controller';
import type { ListingsService } from './listings.service';
import type { ListingsRepository } from './listings.repository';
import type { ListingBoostService } from '../listing-boost/listing-boost.service';
import type { UsersService } from '../users/users.service';
import type { ApiConfig } from '../config/load';
import type { AuthUser } from '../auth/auth.types';

function makeController(over: {
  rows?: Array<Record<string, unknown>>;
  boosts?: Record<string, { endsAt: Date; remainingMs: number } | null>;
  flags?: { boost?: boolean; premium?: boolean; vo?: boolean; checklist?: boolean };
}) {
  const listingsService = {} as unknown as ListingsService;
  const repo = {
    listForOwner: vi.fn().mockResolvedValue(over.rows ?? []),
  } as unknown as ListingsRepository;
  const boosts = {
    activeBoostForListing: vi
      .fn()
      .mockImplementation(async (id: string) => over.boosts?.[id] ?? null),
  } as unknown as ListingBoostService;
  const users = {
    getOrCreate: vi.fn().mockResolvedValue({ id: 'me' }),
  } as unknown as UsersService;
  const config = {
    LISTING_BOOST_ENABLED: over.flags?.boost ?? true,
    SELLER_PREMIUM_ENABLED: over.flags?.premium ?? true,
    VERIFIED_OWNER_ENABLED: over.flags?.vo ?? true,
    SELLER_CHECKLIST_ENABLED: over.flags?.checklist ?? true,
  } as unknown as ApiConfig;
  return {
    controller: new SellerListingsController(listingsService, repo, boosts, users, config),
    repo,
    boosts,
  };
}

const seller: AuthUser = { sub: 'u', roles: ['seller'] };

describe('SellerListingsController (PP-5 dashboard index)', () => {
  it('returns owner listings with boost state when flag on', async () => {
    const ends = new Date('2026-08-20T00:00:00.000Z');
    const { controller } = makeController({
      rows: [
        {
          id: 'l1',
          slug: 'casa-roma',
          title: 'Casa Roma',
          status: 'published',
          city: 'Roma',
          price: '250000',
          currency: 'EUR',
          coverUrl: null,
        },
      ],
      boosts: { l1: { endsAt: ends, remainingMs: 3 * 86_400_000 } },
    });
    const res = await controller.listMine(seller);
    expect(res.flags.listingBoostEnabled).toBe(true);
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.boost?.active).toBe(true);
    expect(res.items[0]?.boost?.remainingDays).toBe(3);
  });

  it('omits boost purchase surface when LISTING_BOOST_ENABLED=false', async () => {
    const { controller } = makeController({
      flags: { boost: false, premium: true },
      rows: [{ id: 'l1', slug: null, title: 'T', status: 'published', city: null, price: null, currency: 'EUR', coverUrl: null }],
    });
    const res = await controller.listMine(seller);
    expect(res.flags.listingBoostEnabled).toBe(false);
    expect(res.items[0]?.boost).toBeNull();
  });

  it('exposes trust flags off by default shape (PP-6)', async () => {
    const { controller } = makeController({
      flags: { boost: false, premium: false, vo: false, checklist: false },
      rows: [
        {
          id: 'l1',
          slug: null,
          title: 'T',
          status: 'published',
          city: null,
          price: null,
          currency: 'EUR',
          coverUrl: null,
          voState: null,
          docCompleteness: null,
        },
      ],
    });
    const res = await controller.listMine(seller);
    expect(res.flags.verifiedOwnerEnabled).toBe(false);
    expect(res.flags.sellerChecklistEnabled).toBe(false);
    expect(res.items[0]?.trust.verifiedOwner).toBe(false);
    expect(res.items[0]?.trust.docScore).toBeNull();
  });
});
