import { describe, expect, it, vi } from 'vitest';
import { ShareLinksService } from './share-links.service';
import type { ShareLinksRepository } from './share-links.repository';
import type { ListingsRepository } from '../listings/listings.repository';
import type { AuthUser } from '../auth/auth.types';

const agentUser: AuthUser = { sub: 'u1', roles: ['agent'] };

describe('ShareLinksService', () => {
  const make = (repo: Partial<ShareLinksRepository>, listings: Partial<ListingsRepository> = {}) =>
    new ShareLinksService(repo as ShareLinksRepository, listings as ListingsRepository);

  it('blocks create when not listing owner', async () => {
    const svc = make({
      listingForShare: vi.fn().mockResolvedValue({
        id: 'l1',
        status: 'published',
        agentId: 'other',
        ownerUserId: 'other',
      }),
    });
    await expect(svc.create('l1', 'me', agentUser, {})).rejects.toThrow('not your listing');
  });

  it('returns gone for revoked token on public payload', async () => {
    const svc = make({
      findByToken: vi.fn().mockResolvedValue({
        id: 's1',
        token: 'tok',
        revokedAt: new Date(),
        listingId: 'l1',
      }),
    });
    await expect(svc.getPublicPayload('tok')).rejects.toThrow('revoked');
  });

  it('increments view counts via recordView', async () => {
    const recordView = vi.fn().mockResolvedValue({ uniqueAdded: true });
    const findByToken = vi.fn().mockResolvedValue({
      id: 's1',
      token: 'tok',
      revokedAt: null,
      viewCount: 1,
      uniqueViewCount: 0,
    });
    const findById = vi.fn().mockResolvedValue({
      viewCount: 2,
      uniqueViewCount: 1,
    });
    const svc = make({ findByToken, findById, recordView });
    const res = await svc.recordView('tok', 'visitor-token-12345678');
    expect(recordView).toHaveBeenCalled();
    expect(res.viewCount).toBe(2);
    expect(res.uniqueViewCount).toBe(1);
  });
});
