import { describe, expect, it } from 'vitest';

import { smartLinkListingToDetail, smartLinkPhotoUrls } from './smartlink-listing';
import type { SmartLinkPublicPayload } from './smartlink';

const listing: SmartLinkPublicPayload['listing'] = {
  slug: 'duplex-lavagno',
  title: 'Duplex for sale',
  city: 'Lavagno',
  province: 'VI',
  transactionType: 'sale',
  transactionTypes: ['sale'],
  price: 195000,
  currency: 'EUR',
  bedrooms: 2,
  bathrooms: 1,
  rooms: 3,
  sizeSqm: 90,
  surfaceSqm: null,
  yearBuilt: 1990,
  energyClass: 'e',
  features: ['garden'],
  status: 'published',
  media: [{ url: '/api/media/file/a.jpg', alt: 'front', width: 800, height: 600, position: 0 }],
  coverUrl: '/api/media/file/a.jpg',
};

describe('smartlink-listing', () => {
  it('maps public payload into ParsedListingDetail for PR #38 components', () => {
    const parsed = smartLinkListingToDetail(listing, 'tok123');
    expect(parsed.slug).toBe('duplex-lavagno');
    expect(parsed.photoUrls[0]).toContain('media/file');
    expect(parsed.bedrooms).toBe(2);
  });

  it('falls back to cover when media empty', () => {
    const urls = smartLinkPhotoUrls({ ...listing, media: [], coverUrl: '/api/media/file/cover.jpg' });
    expect(urls).toEqual(['/api/media/file/cover.jpg']);
  });
});
