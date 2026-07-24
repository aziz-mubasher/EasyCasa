import { describe, expect, it, vi } from 'vitest';

import { ShareLinksService, PRIVATE_LISTING_KEYS } from './share-links.service';
import type { ShareLinksRepository } from './share-links.repository';
import type { ListingsRepository } from '../listings/listings.repository';
import type { ListingsService } from '../listings/listings.service';

const listingRow = {
  id: 'l1',
  title: 'Casa',
  city: 'Brescia',
  province: 'BS',
  transactionType: 'sale',
  transactionTypes: ['sale'],
  price: '200000',
  currency: 'EUR',
  bedrooms: 2,
  bathrooms: 1,
  rooms: 3,
  sizeSqm: '90',
  surfaceSqm: null,
  yearBuilt: 1990,
  energyClass: 'G',
  features: ['garden'],
  status: 'published',
  agentId: 'agent-1',
  ownerUserId: 'agent-1',
  slug: 'casa-brescia',
  address: 'Via Segreta 1',
  postalCode: '25100',
  foglio: '1',
  particella: '2',
  subalterno: '3',
  wpPostId: 99,
  qrCodeUrl: 'http://x',
  mediatorUserId: null,
};

describe('ShareLinksService', () => {
  it('public listing payload omits private fields', () => {
    const svc = new ShareLinksService({} as ShareLinksRepository, {} as ListingsRepository, {} as ListingsService);
    const payload = svc.toPublicListing(listingRow as NonNullable<Awaited<ReturnType<ListingsRepository['findById']>>>, [
      { id: 'm1', url: '/api/media/file/x.jpg', type: 'image', width: 800, height: 600, alt: 'facciata', position: 0 },
    ]);
    const json = JSON.stringify(payload);
    for (const key of PRIVATE_LISTING_KEYS) {
      expect(json).not.toContain(`"${key}"`);
    }
    expect(payload.title).toBe('Casa');
    expect(payload.coverUrl).toContain('media/file');
  });

  it('blocks create when caller does not own listing', async () => {
    const listingsRepo = {
      findById: vi.fn().mockResolvedValue({ ...listingRow, agentId: 'other', ownerUserId: 'other' }),
    } as unknown as ListingsRepository;
    const svc = new ShareLinksService({} as ShareLinksRepository, listingsRepo, {} as ListingsService);
    await expect(
      svc.create({ listingId: 'l1' }, 'me', { sub: 'me', roles: ['seller'] }),
    ).rejects.toThrow('not your listing');
  });
});
