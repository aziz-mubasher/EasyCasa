import { describe, expect, it, vi } from 'vitest';

import { ListingsService } from './listings.service';
import type { ListingsRepository } from './listings.repository';
import type { SearchService } from '../search/search.service';
import type { RawListing } from './domain/types';

const PRIVATE_PHONE = '+393339998877';
const PRIVATE_EMAIL = 'private-seller@example.com';
const AGENCY_PHONE = '+390301112233';
const LISTING_ID = '11111111-1111-4111-8111-111111111111';

const searchMock = {
  indexListing: vi.fn(),
  remove: vi.fn(),
} as unknown as SearchService;

function rawListing(): RawListing {
  return {
    id: LISTING_ID,
    title: 'Bilocale',
    description: 'Luminoso',
    dealType: 'sale',
    type: 'apartment',
    status: 'published',
    priceCents: 20_000_000,
    areaM2: 60,
    rooms: 2,
    bathrooms: 1,
    floor: 1,
    totalFloors: 4,
    yearBuilt: 1980,
    energyClass: 'D',
    energyPerformanceKwhM2Y: 160,
    foglio: null,
    particella: null,
    subalterno: null,
    features: [],
    condominioFeesCents: null,
    heating: null,
    lat: 45.5,
    lng: 10.2,
    address: 'Via Roma 1',
    comune: 'Brescia',
    provincia: 'BS',
    photos: [{ url: 'https://cdn.example/a.jpg', sortOrder: 0 }],
    hasFloorPlan: false,
    agentId: 'owner-1',
    agentName: 'Mario',
  };
}

function row() {
  return {
    id: LISTING_ID,
    slug: 'bilocale-brescia',
    title: 'Bilocale',
    description: 'Luminoso',
    status: 'published',
    transactionType: 'sale',
    transactionTypes: ['sale'],
    price: '200000',
    currency: 'EUR',
    bedrooms: 2,
    bathrooms: 1,
    rooms: 2,
    sizeSqm: '60',
    surfaceSqm: null,
    landSqm: null,
    floor: '1',
    totalFloors: 4,
    yearBuilt: 1980,
    yearRenovated: null,
    energyClass: 'D',
    energyPerformanceKwhM2Y: '160',
    foglio: null,
    particella: null,
    subalterno: null,
    condition: null,
    features: [],
    city: 'Brescia',
    province: 'BS',
    address: 'Via Roma 1',
    propertyType: 'apartment',
    firstPublishedAt: null,
    latitude: 45.5,
    longitude: 10.2,
    agentId: 'owner-1',
    ownerUserId: 'owner-1',
  };
}

function service(phone: string | null) {
  const repo = {
    findById: vi.fn().mockResolvedValue(row()),
    findBySlug: vi.fn().mockResolvedValue(row()),
    listMedia: vi.fn().mockResolvedValue([
      { url: 'https://cdn.example/a.jpg', type: 'image', position: 0 },
    ]),
  } as unknown as ListingsRepository;
  const users = {
    publicContactFor: vi.fn().mockResolvedValue({
      id: 'owner-1',
      displayName: 'Mario',
      phone,
      slug: 'mario',
      bio: null,
      avatarUrl: null,
      email: PRIVATE_EMAIL,
    }),
  };
  const read = { getRaw: vi.fn().mockResolvedValue(rawListing()), findSimilar: vi.fn() };
  const boosts = { isListingBoosted: vi.fn().mockResolvedValue(false) };
  const svc = new ListingsService(
    repo,
    searchMock,
    read as never,
    { onListingPublished: vi.fn() } as never,
    { forInput: vi.fn() } as never,
    users as never,
    {} as never,
    boosts as never,
  );
  return { svc, users };
}

describe('GET /listings/:slug public projection', () => {
  it('returns one shape for UUID and slug, with no private phone or email', async () => {
    const { svc } = service(null);
    const byId = await svc.getBySlug(LISTING_ID);
    const bySlug = await svc.getBySlug('bilocale-brescia');
    expect(byId).toEqual(bySlug);
    expect(byId).toMatchObject({
      id: LISTING_ID,
      slug: 'bilocale-brescia',
      price: 200000,
      priceCents: 20_000_000,
      dealType: 'sale',
    });
    const agent = byId.agent as { phone: string | null; displayName: string };
    expect(agent.phone).toBeNull();
    expect(agent).not.toHaveProperty('email');
    const json = JSON.stringify(byId);
    expect(json).not.toContain(PRIVATE_PHONE);
    expect(json).not.toContain(PRIVATE_EMAIL);
    expect(json).not.toContain('ownerUserId');
  });

  it('includes the agency phone when the contact gate returned one', async () => {
    const { svc, users } = service(AGENCY_PHONE);
    const body = await svc.getBySlug('bilocale-brescia');
    expect(users.publicContactFor).toHaveBeenCalledWith('owner-1');
    const agent = body.agent as { phone: string | null };
    expect(agent.phone).toBe(AGENCY_PHONE);
    expect(JSON.stringify(body)).not.toContain(PRIVATE_EMAIL);
  });
});
