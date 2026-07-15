import { describe, it, expect, vi } from 'vitest';
import { ListingsService } from './listings.service';
import type { ListingsRepository } from './listings.repository';
import type { AuthUser } from '../auth/auth.types';

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

describe('ListingsService', () => {
  it('creates a draft with a slug and syncs location when coords present', async () => {
    const insert = vi.fn().mockResolvedValue({ id: 'l1' });
    const syncLocation = vi.fn().mockResolvedValue(undefined);
    const svc = new ListingsService(makeRepo({ insert, syncLocation }));

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
    const svc = new ListingsService(makeRepo({ findById }));
    const user: AuthUser = { sub: 'u', roles: ['seller'] };

    await expect(svc.update('l1', { title: 'x' }, user, 'me')).rejects.toThrow('not your listing');
  });

  it('allows admin to update any listing', async () => {
    const findById = vi.fn().mockResolvedValue({ id: 'l1', agentId: 'someone-else' });
    const update = vi.fn().mockResolvedValue({ id: 'l1' });
    const svc = new ListingsService(makeRepo({ findById, update }));
    const admin: AuthUser = { sub: 'a', roles: ['admin'] };

    const res = await svc.update('l1', { title: 'x' }, admin, 'me');
    expect(res).toEqual({ id: 'l1' });
  });
});
