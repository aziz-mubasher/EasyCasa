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

describe('ListingsService', () => {
  it('creates a draft with a slug and syncs location when coords present', async () => {
    const insert = vi.fn().mockResolvedValue({ id: 'l1' });
    const syncLocation = vi.fn().mockResolvedValue(undefined);
    const svc = new ListingsService(
      makeRepo({ insert, syncLocation }),
      searchMock,
      readMock as never,
      alertsMock as never,
    );

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
    const svc = new ListingsService(
      makeRepo({ findById }),
      searchMock,
      readMock as never,
      alertsMock as never,
    );
    const user: AuthUser = { sub: 'u', roles: ['seller'] };

    await expect(svc.update('l1', { title: 'x' }, user, 'me')).rejects.toThrow('not your listing');
  });

  it('allows admin to update any listing', async () => {
    const findById = vi.fn().mockResolvedValue({ id: 'l1', agentId: 'someone-else' });
    const update = vi.fn().mockResolvedValue({ id: 'l1' });
    const svc = new ListingsService(
      makeRepo({ findById, update }),
      searchMock,
      readMock as never,
      alertsMock as never,
    );
    const admin: AuthUser = { sub: 'a', roles: ['admin'] };

    const res = await svc.update('l1', { title: 'x' }, admin, 'me');
    expect(res).toEqual({ id: 'l1' });
  });

  it('indexes coverUrl from first image media on publish', async () => {
    vi.mocked(searchMock.indexListing).mockClear();
    const findById = vi.fn().mockResolvedValue({ id: 'l1', agentId: 'me' });
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
    });
    const svc = new ListingsService(
      makeRepo({ findById, update, listMedia }),
      searchMock,
      readMock as never,
      alertsMock as never,
    );
    const user: AuthUser = { sub: 'u', roles: ['seller'] };

    await svc.publish('l1', user, 'me');

    expect(searchMock.indexListing).toHaveBeenCalledWith(
      expect.objectContaining({
        coverUrl: 'https://example.com/cover.jpg',
        imageUrls: ['https://example.com/cover.jpg'],
      }),
    );
  });
});
