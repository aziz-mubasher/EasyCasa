import { describe, it, expect, vi } from 'vitest';
import { ListingsService } from './listings.service';
import type { ListingsRepository } from './listings.repository';
import type { AuthUser } from '../auth/auth.types';
import type { SearchService } from '../search/search.service';

const searchMock = {
  indexListing: vi.fn(),
  remove: vi.fn(),
  indexBatch: vi.fn(),
  ensureSettings: vi.fn(),
  search: vi.fn(),
} as unknown as SearchService;

const makeRepo = (over: Partial<ListingsRepository> = {}) =>
  ({
    findById: vi.fn(),
    findBySlug: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    syncLocation: vi.fn(),
    search: vi.fn(),
    ...over,
  }) as unknown as ListingsRepository;

const readMock = {
  getRaw: vi.fn(),
  findSimilar: vi.fn(),
};

const alertsMock = {
  onListingPublished: vi.fn().mockResolvedValue(undefined),
  runDigests: vi.fn().mockResolvedValue(undefined),
};

const valuationBandMock = {
  enabled: vi.fn().mockReturnValue(true),
  forInput: vi.fn(),
};

const usersMock = {
  findById: vi.fn().mockResolvedValue(null),
  assertNotSuspended: vi.fn().mockResolvedValue(undefined),
  isSuspended: vi.fn().mockReturnValue(false),
};

function makeService(repo: ListingsRepository) {
  const boostsMock = {
    pauseForListing: vi.fn().mockResolvedValue(undefined),
    resumeForListing: vi.fn().mockResolvedValue(undefined),
    boostWeightForListing: vi.fn().mockResolvedValue(0),
    isListingBoosted: vi.fn().mockResolvedValue(false),
  };
  return new ListingsService(
    repo,
    searchMock,
    readMock as never,
    alertsMock as never,
    valuationBandMock as never,
    usersMock as never,
    {} as never, // DRIZZLE — view recording fail-soft; unused in unit tests
    boostsMock as never,
  );
}

describe('ListingsService', () => {
  it('creates a draft with a slug and syncs location when coords present', async () => {
    const insert = vi.fn().mockResolvedValue({ id: 'l1' });
    const syncLocation = vi.fn().mockResolvedValue(undefined);
    const svc = makeService(makeRepo({ insert, syncLocation }));

    await svc.create(
      { title: 'Nice Flat', latitude: 45.5, longitude: 9.2 } as never,
      'agent-1',
    );

    expect(insert).toHaveBeenCalledOnce();
    const values = insert.mock.calls[0][0];
    expect(values.slug).toContain('nice-flat');
    expect(values.agentId).toBe('agent-1');
    expect(values.status).toBe('draft');
    expect(syncLocation).toHaveBeenCalledWith('l1', 45.5, 9.2);
  });

  it('blocks updating a listing you do not own (non-admin)', async () => {
    const findById = vi.fn().mockResolvedValue({ id: 'l1', agentId: 'someone-else' });
    const svc = makeService(makeRepo({ findById }));
    const user: AuthUser = { sub: 'u', roles: ['seller'] };

    await expect(svc.update('l1', { title: 'x' }, user, 'me')).rejects.toThrow('not your listing');
  });

  it('allows ownerUserId to update even when agentId differs (EC-11)', async () => {
    const findById = vi.fn().mockResolvedValue({
      id: 'l1',
      agentId: 'agency-agent',
      ownerUserId: 'me',
      mediatorUserId: null,
    });
    const update = vi.fn().mockResolvedValue({ id: 'l1' });
    const svc = makeService(makeRepo({ findById, update }));
    const user: AuthUser = { sub: 'u', roles: ['seller'] };

    const res = await svc.update('l1', { title: 'x' }, user, 'me');
    expect(res).toEqual({ id: 'l1' });
  });

  it('allows admin to update any listing', async () => {
    const findById = vi.fn().mockResolvedValue({ id: 'l1', agentId: 'someone-else' });
    const update = vi.fn().mockResolvedValue({ id: 'l1' });
    const svc = makeService(makeRepo({ findById, update }));
    const admin: AuthUser = { sub: 'a', roles: ['admin'] };

    const res = await svc.update('l1', { title: 'x' }, admin, 'me');
    expect(res).toEqual({ id: 'l1' });
  });

  it('indexes coverUrl from first image media on publish', async () => {
    vi.mocked(searchMock.indexListing).mockClear();
    const findById = vi.fn().mockResolvedValue({
      id: 'l1',
      agentId: 'me',
      ownerUserId: 'me',
      mediatorUserId: null,
      status: 'draft',
      firstPublishedAt: null,
      publishedAt: null,
      unpublishedAt: null,
    });
    const listMedia = vi.fn().mockResolvedValue([
      { type: 'video', url: 'https://example.com/v.mp4' },
      { type: 'image', url: 'https://example.com/cover.jpg' },
    ]);
    const update = vi.fn().mockResolvedValue({
      id: 'l1',
      slug: 'l1',
      title: 'Flat',
      description: null,
      city: 'Milano',
      province: 'MI',
      transactionType: 'sale',
      assetClass: 'residential',
      propertyType: 'apartment',
      condition: 'good',
      financingOptions: [],
      leaseType: null,
      sellerType: 'private',
      price: '100',
      bedrooms: 1,
      bathrooms: 1,
      rooms: 1,
      sizeSqm: '50',
      energyClass: null,
      latitude: null,
      longitude: null,
      publishedAt: new Date('2026-01-01T00:00:00Z'),
      firstPublishedAt: new Date('2026-01-01T00:00:00Z'),
    });
    const svc = makeService(makeRepo({ findById, update, listMedia }));
    const user: AuthUser = { sub: 'u', roles: ['seller'] };

    await svc.publish('l1', user, 'me');

    expect(update).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({
        status: 'published',
        firstPublishedAt: expect.any(Date),
      }),
    );
    expect(searchMock.indexListing).toHaveBeenCalledWith(
      expect.objectContaining({
        coverUrl: 'https://example.com/cover.jpg',
        imageUrls: ['https://example.com/cover.jpg'],
      }),
    );
  });

  it('INVARIANT: unpublish → republish preserves firstPublishedAt and removes from search', async () => {
    vi.mocked(searchMock.indexListing).mockClear();
    vi.mocked(searchMock.remove).mockClear();
    const first = new Date('2026-05-01T09:00:00Z');
    const findById = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'l1',
        agentId: 'me',
        ownerUserId: 'me',
        mediatorUserId: null,
        status: 'published',
        firstPublishedAt: first,
        publishedAt: first,
        unpublishedAt: null,
      })
      .mockResolvedValueOnce({
        id: 'l1',
        agentId: 'me',
        ownerUserId: 'me',
        mediatorUserId: null,
        status: 'unpublished',
        firstPublishedAt: first,
        publishedAt: first,
        unpublishedAt: new Date('2026-06-01T09:00:00Z'),
      });
    const update = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'l1',
        status: 'unpublished',
        firstPublishedAt: first,
        unpublishedAt: new Date('2026-06-01T09:00:00Z'),
      })
      .mockResolvedValueOnce({
        id: 'l1',
        slug: 'l1',
        title: 'Flat',
        description: null,
        city: 'Milano',
        province: 'MI',
        transactionType: 'sale',
        assetClass: null,
        propertyType: null,
        condition: null,
        financingOptions: [],
        leaseType: null,
        sellerType: 'private',
        price: null,
        bedrooms: null,
        bathrooms: null,
        rooms: null,
        sizeSqm: null,
        surfaceSqm: null,
        yearBuilt: null,
        yearRenovated: null,
        energyClass: null,
        features: [],
        latitude: null,
        longitude: null,
        publishedAt: new Date('2026-08-01T09:00:00Z'),
        firstPublishedAt: first,
      });
    const listMedia = vi.fn().mockResolvedValue([]);
    const svc = makeService(makeRepo({ findById, update, listMedia }));
    const user: AuthUser = { sub: 'u', roles: ['seller'] };

    await svc.unpublish('l1', user, 'me');
    expect(searchMock.remove).toHaveBeenCalledWith('l1');
    expect(update.mock.calls[0][1]).toEqual(
      expect.objectContaining({ status: 'unpublished' }),
    );
    expect(update.mock.calls[0][1]).not.toHaveProperty('firstPublishedAt');

    await svc.publish('l1', user, 'me');
    expect(update.mock.calls[1][1].firstPublishedAt).toEqual(first);
    expect(searchMock.indexListing).toHaveBeenCalled();
  });
});
