import { describe, expect, it } from 'vitest';

import { buildListingTrust } from './listing-trust';

describe('buildListingTrust (EC-S-T17)', () => {
  const createdAt = new Date('2026-08-01T00:00:00Z');
  const now = new Date('2026-08-10T00:00:00Z');

  it('badge only when VO state is verified', () => {
    for (const state of ['none', 'submitted', 'in_review', 'rejected', 'revoked', 'expired', null]) {
      expect(
        buildListingTrust({
          voState: state,
          docHave: null,
          docTotal: null,
          hasSellerProfile: false,
          publishedAt: createdAt,
          createdAt,
          now,
        }).verifiedOwner,
      ).toBe(false);
    }
    expect(
      buildListingTrust({
        voState: 'verified',
        docHave: 3,
        docTotal: 4,
        hasSellerProfile: true,
        publishedAt: createdAt,
        createdAt,
        now,
      }),
    ).toEqual({
      verifiedOwner: true,
      docScore: { have: 3, total: 4 },
      listedByOwner: true,
      daysOnMarket: 9,
    });
  });

  it('falls back to createdAt when publishedAt missing (T13 caveat)', () => {
    expect(
      buildListingTrust({
        voState: null,
        docHave: null,
        docTotal: null,
        hasSellerProfile: false,
        publishedAt: null,
        createdAt,
        now,
      }).daysOnMarket,
    ).toBe(9);
  });
});
