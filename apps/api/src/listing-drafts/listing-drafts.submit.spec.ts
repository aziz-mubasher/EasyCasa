import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../auth/auth.types';
import { ListingDraftsService } from './listing-drafts.service';

const readyDraft = {
  currentStep: 'review',
  propertyType: 'apartment',
  title: 'Bilocale luminoso',
  address: 'Via Roma 1',
  city: 'Milano',
  province: 'MI',
  postalCode: '20121',
  lat: 45.46,
  lng: 9.19,
  sqm: 65,
  rooms: 2,
  bathrooms: 1,
  price: 320000,
  photoUrls: ['https://cdn.example/a.webp', 'https://cdn.example/b.webp', 'https://cdn.example/c.webp'],
  description: 'A'.repeat(50),
  acceptedTerms: true,
};

describe('ListingDraftsService.submit (PR-W)', () => {
  it('creates listing, attaches photos, publishes once, marks draft submitted', async () => {
    const firstPublishedAt = new Date('2026-08-11T10:00:00Z');
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ userId: 'u1' }]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };
    // get() path: select listing_draft row
    let selectCall = 0;
    db.select = vi.fn().mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1) {
        // requireSeller
        return {
          from: () => ({
            where: () => ({
              limit: async () => [{ userId: 'u1' }],
            }),
          }),
        };
      }
      // get draft
      return {
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 'd1',
                sellerId: 'u1',
                status: 'draft',
                payload: readyDraft,
                currentStep: 'review',
              },
            ],
          }),
        }),
      };
    });

    const listings = {
      create: vi.fn().mockResolvedValue({ id: 'L1' }),
      publish: vi.fn().mockResolvedValue({
        id: 'L1',
        firstPublishedAt,
        publishedAt: firstPublishedAt,
      }),
    };

    const svc = new ListingDraftsService(db as never, listings as never);
    const user: AuthUser = { sub: 'oidc', roles: ['seller'] };
    const out = await svc.submit('u1', 'd1', user);

    expect(listings.create).toHaveBeenCalledOnce();
    expect(listings.publish).toHaveBeenCalledWith('L1', user, 'u1');
    expect(out.listingId).toBe('L1');
    expect(out.firstPublishedAt).toEqual(firstPublishedAt);
    expect(db.insert).toHaveBeenCalled(); // media rows
    expect(db.update).toHaveBeenCalled();
  });
});
