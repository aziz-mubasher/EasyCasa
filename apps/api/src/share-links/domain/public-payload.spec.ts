import { describe, expect, it } from 'vitest';
import { buildPublicShareListing, withheldListingFields } from './public-payload';

describe('public-payload', () => {
  it('withholds internal / PII-heavy listing fields', () => {
    const withheld = withheldListingFields();
    expect(withheld).toContain('address');
    expect(withheld).toContain('ownerUserId');
    expect(withheld).toContain('latitude');
  });

  it('maps only marketing-safe listing fields', () => {
    const listing = buildPublicShareListing(
      {
        id: 'uuid',
        slug: 'nice-flat',
        title: 'Nice Flat',
        description: 'Hello',
        city: 'Milano',
        province: 'MI',
        transactionType: 'sale',
        transactionTypes: ['sale'],
        price: '250000',
        currency: 'EUR',
        bedrooms: 2,
        bathrooms: 1,
        rooms: 3,
        sizeSqm: '90',
        surfaceSqm: '95',
        yearBuilt: 1990,
        yearRenovated: null,
        energyClass: 'G',
        propertyType: 'apartment',
        condition: 'good',
        features: ['garden'],
        address: 'Secret St 1',
        agentId: 'agent',
        ownerUserId: 'owner',
        latitude: 45.4,
        longitude: 9.1,
        status: 'published',
      } as never,
      [{ url: '/api/media/file/x.jpg', type: 'image', alt: 'cover', position: 0, width: null, height: null }],
    );
    expect(listing.slug).toBe('nice-flat');
    expect(listing.media[0]?.url).toContain('media/file');
    expect(Object.keys(listing)).not.toContain('address');
    expect(Object.keys(listing)).not.toContain('agentId');
  });
});
