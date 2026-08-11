import { describe, expect, it } from 'vitest';

import { buildListingTrust } from './listing-trust';

describe('buildListingTrust (EC-S-T17 + T13)', () => {
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
          status: 'published',
          firstPublishedAt: createdAt,
          publishedAt: createdAt,
          unpublishedAt: null,
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
        status: 'published',
        firstPublishedAt: createdAt,
        publishedAt: createdAt,
        unpublishedAt: null,
        createdAt,
        now,
      }),
    ).toEqual({
      verifiedOwner: true,
      docScore: { have: 3, total: 4 },
      listedByOwner: true,
      daysOnMarket: 9,
      showDaysOnMarket: true,
    });
  });

  it('uses firstPublishedAt over later publishedAt (relist honesty)', () => {
    expect(
      buildListingTrust({
        voState: null,
        docHave: null,
        docTotal: null,
        hasSellerProfile: false,
        status: 'published',
        firstPublishedAt: new Date('2026-05-01T00:00:00Z'),
        publishedAt: new Date('2026-08-01T00:00:00Z'),
        unpublishedAt: null,
        createdAt,
        now: new Date('2026-08-11T00:00:00Z'),
      }).daysOnMarket,
    ).toBe(102);
  });

  it('hides market-time chip when unpublished', () => {
    expect(
      buildListingTrust({
        voState: null,
        docHave: null,
        docTotal: null,
        hasSellerProfile: false,
        status: 'unpublished',
        firstPublishedAt: createdAt,
        publishedAt: createdAt,
        unpublishedAt: now,
        createdAt,
        now,
      }).showDaysOnMarket,
    ).toBe(false);
  });

  it('falls back to createdAt for published rows missing both timestamps', () => {
    expect(
      buildListingTrust({
        voState: null,
        docHave: null,
        docTotal: null,
        hasSellerProfile: false,
        status: 'published',
        firstPublishedAt: null,
        publishedAt: null,
        unpublishedAt: null,
        createdAt,
        now,
      }).daysOnMarket,
    ).toBe(9);
  });
});
