import { describe, expect, it, vi } from 'vitest';

import { resetConfigCache } from '../config';
import { ShareLinksService, PRIVATE_LISTING_KEYS } from './share-links.service';
import type { ShareLinksRepository } from './share-links.repository';
import type { ListingsRepository } from '../listings/listings.repository';
import type { ListingsService } from '../listings/listings.service';
import type { UsersService } from '../users/users.service';

const PRIVATE_PHONE = '+393339998877';
const PRIVATE_EMAIL = 'private-seller@example.com';
const AGENCY_PHONE = '+390301112233';

function ensureConfig() {
  process.env.NODE_ENV ??= 'test';
  process.env.DATABASE_URL ??= 'postgresql://easycasa:change_me@localhost:5432/easycasa';
  process.env.WA_HANDLE_SECRET ??= 'test-wa-handle-secret-xx';
  process.env.EC_TEST_AUTH ??= 'true';
  process.env.ALLOW_PROVIDER_STUBS ??= 'true';
  resetConfigCache();
}

function usersStub(phone: string | null = null) {
  return {
    publicContactFor: vi.fn().mockResolvedValue({
      id: 'agent-1',
      displayName: 'Me',
      phone,
      slug: 'studio',
      bio: null,
      avatarUrl: null,
    }),
  } as unknown as UsersService;
}

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
    const svc = new ShareLinksService(
      {} as ShareLinksRepository,
      {} as ListingsRepository,
      {} as ListingsService,
      usersStub(),
    );
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

  it('allows create when user owns the listing (buyer role)', async () => {
    const listingsRepo = {
      findById: vi.fn().mockResolvedValue({ ...listingRow, agentId: 'me', ownerUserId: 'me' }),
    } as unknown as ListingsRepository;
    const repo = {
      agentSnapshotForUser: vi.fn().mockResolvedValue({
        displayName: 'Me',
        phone: PRIVATE_PHONE,
        bio: null,
        slug: null,
        email: PRIVATE_EMAIL,
      }),
      insertLink: vi.fn().mockResolvedValue({
        id: 'sl1',
        token: 'tok',
        listingId: 'l1',
        includeValuationBand: true,
        viewCount: 0,
        uniqueViewCount: 0,
        lastViewedAt: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        revokedAt: null,
      }),
    } as unknown as ShareLinksRepository;
    const users = usersStub();
    const svc = new ShareLinksService(repo, listingsRepo, {} as ListingsService, users);
    const row = await svc.create({ listingId: 'l1' }, 'me', { sub: 'me', roles: ['buyer'] });
    expect(row.token).toBe('tok');
    const stored = (repo.insertLink as ReturnType<typeof vi.fn>).mock.calls[0][0].agentSnapshot;
    expect(stored.phone).toBeNull();
    expect(JSON.stringify(stored)).not.toContain(PRIVATE_PHONE);
    expect(JSON.stringify(stored)).not.toContain(PRIVATE_EMAIL);
  });

  it('rejects create for another users listing even with seller role', async () => {
    const listingsRepo = {
      findById: vi.fn().mockResolvedValue({ ...listingRow, agentId: 'other', ownerUserId: 'other' }),
    } as unknown as ListingsRepository;
    const svc = new ShareLinksService(
      {} as ShareLinksRepository,
      listingsRepo,
      {} as ListingsService,
      usersStub(),
    );
    await expect(
      svc.create({ listingId: 'l1' }, 'me', { sub: 'me', roles: ['seller'] }),
    ).rejects.toThrow('not authorized for this listing');
  });

  it('rejects create for buyer without ownership', async () => {
    const listingsRepo = {
      findById: vi.fn().mockResolvedValue({ ...listingRow, agentId: 'other', ownerUserId: 'other' }),
    } as unknown as ListingsRepository;
    const svc = new ShareLinksService(
      {} as ShareLinksRepository,
      listingsRepo,
      {} as ListingsService,
      usersStub(),
    );
    await expect(
      svc.create({ listingId: 'l1' }, 'me', { sub: 'me', roles: ['buyer'] }),
    ).rejects.toThrow('insufficient role');
  });

  it('blocks create when listing is not published', async () => {
    const listingsRepo = {
      findById: vi.fn().mockResolvedValue({ ...listingRow, status: 'draft' }),
    } as unknown as ListingsRepository;
    const svc = new ShareLinksService(
      {} as ShareLinksRepository,
      listingsRepo,
      {} as ListingsService,
      usersStub(),
    );
    await expect(
      svc.create({ listingId: 'l1' }, 'me', { sub: 'me', roles: ['buyer'] }),
    ).rejects.toThrow('listing must be published');
  });

  it('public payload omits a private seller phone and email stored on the snapshot', async () => {
    ensureConfig();
    const listingsRepo = {
      findById: vi.fn().mockResolvedValue(listingRow),
      listMedia: vi.fn().mockResolvedValue([]),
    } as unknown as ListingsRepository;
    const repo = {
      findByToken: vi.fn().mockResolvedValue({
        id: 'sl1',
        token: 'tok',
        listingId: 'l1',
        createdBy: 'seller-1',
        revokedAt: null,
        includeValuationBand: false,
        agentSnapshot: {
          displayName: 'Private',
          phone: PRIVATE_PHONE,
          bio: null,
          slug: 'private',
          email: PRIVATE_EMAIL,
        },
      }),
      recordView: vi.fn().mockResolvedValue({ viewCount: 1, uniqueViewCount: 1 }),
    } as unknown as ShareLinksRepository;
    const svc = new ShareLinksService(
      repo,
      listingsRepo,
      { getValuationBand: vi.fn() } as unknown as ListingsService,
      usersStub(null),
    );
    const payload = await svc.getPublicPayload('tok', null);
    const json = JSON.stringify(payload);
    expect(payload.agent.phone).toBeNull();
    expect(json).not.toContain(PRIVATE_PHONE);
    expect(json).not.toContain(PRIVATE_EMAIL);
  });

  it('public payload keeps an agency phone from the credential gate', async () => {
    ensureConfig();
    const listingsRepo = {
      findById: vi.fn().mockResolvedValue(listingRow),
      listMedia: vi.fn().mockResolvedValue([]),
    } as unknown as ListingsRepository;
    const repo = {
      findByToken: vi.fn().mockResolvedValue({
        id: 'sl1',
        token: 'tok',
        listingId: 'l1',
        createdBy: 'agent-1',
        revokedAt: null,
        includeValuationBand: false,
        agentSnapshot: {
          displayName: 'Old',
          phone: PRIVATE_PHONE,
          bio: null,
          slug: null,
        },
      }),
      recordView: vi.fn().mockResolvedValue({ viewCount: 2, uniqueViewCount: 1 }),
    } as unknown as ShareLinksRepository;
    const svc = new ShareLinksService(
      repo,
      listingsRepo,
      { getValuationBand: vi.fn() } as unknown as ListingsService,
      usersStub(AGENCY_PHONE),
    );
    const payload = await svc.getPublicPayload('tok', null);
    expect(payload.agent.phone).toBe(AGENCY_PHONE);
    expect(JSON.stringify(payload)).not.toContain(PRIVATE_PHONE);
  });
});
