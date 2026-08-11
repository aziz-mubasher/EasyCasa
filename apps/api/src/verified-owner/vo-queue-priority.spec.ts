/**
 * EC-S-T27 — VO queue priority is order-only (never a verification standard).
 * The SQL ORDER BY itself needs a real database; this unit test isolates the
 * `priorityModeration` computation (resolveTier + SELLER_PREMIUM_ENABLED gate)
 * that decorates each row after the DB query returns.
 */
import { describe, expect, it } from 'vitest';

import type { Db } from '../db/drizzle';
import type { MediaService } from '../media/media.service';
import { VerifiedOwnerService } from './verified-owner.service';

/** Chainable mock: every method returns the same proxy except `.offset()`,
 * which resolves with the canned rows — mirrors the drizzle query builder
 * shape without hard-coding every method drizzle exposes. */
function makeQueueDb(rows: unknown[]): Db {
  const proxy: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'offset') return () => Promise.resolve(rows);
        return () => proxy;
      },
    },
  );
  return proxy as Db;
}

function caseRow(opts: {
  id: string;
  sellerUserId: string;
  subStatus: 'active' | 'past_due' | 'canceled' | null;
  subPeriodEnd: Date | null;
}) {
  return {
    case: {
      id: opts.id,
      listingId: 'listing-1',
      sellerUserId: opts.sellerUserId,
      state: 'submitted',
      docKeys: [],
      nameMatchVerdict: 'match',
      nameMatchScore: '0.900',
      decisionReason: null,
      verifiedAt: null,
      expiresAt: null,
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
    },
    sellerDisplayName: null,
    subStatus: opts.subStatus,
    subPeriodEnd: opts.subPeriodEnd,
    subCancelAtPeriodEnd: false,
  };
}

const FUTURE = new Date(Date.now() + 30 * 86_400_000);
const media = {} as unknown as MediaService;

describe('VerifiedOwnerService.listQueue — priority flag (T27, order-only)', () => {
  it('flags an active-premium seller row as priorityModeration=true; free row false', async () => {
    const rows = [
      caseRow({ id: 'c-premium', sellerUserId: 's-premium', subStatus: 'active', subPeriodEnd: FUTURE }),
      caseRow({ id: 'c-free', sellerUserId: 's-free', subStatus: null, subPeriodEnd: null }),
    ];
    const svc = new VerifiedOwnerService(
      makeQueueDb(rows),
      { SELLER_PREMIUM_ENABLED: true } as never,
      media,
    );
    const out = await svc.listQueue(['submitted']);
    expect(out.map((r) => r.priorityModeration)).toEqual([true, false]);
  });

  it('SELLER_PREMIUM_ENABLED=false ⇒ every row is priorityModeration=false, even with an active subscription', async () => {
    const rows = [
      caseRow({ id: 'c-premium', sellerUserId: 's-premium', subStatus: 'active', subPeriodEnd: FUTURE }),
    ];
    const svc = new VerifiedOwnerService(
      makeQueueDb(rows),
      { SELLER_PREMIUM_ENABLED: false } as never,
      media,
    );
    const out = await svc.listQueue(['submitted']);
    expect(out.map((r) => r.priorityModeration)).toEqual([false]);
  });

  it('a canceled subscription never gets priority, regardless of the flag', async () => {
    const rows = [
      caseRow({ id: 'c-canceled', sellerUserId: 's-canceled', subStatus: 'canceled', subPeriodEnd: FUTURE }),
    ];
    const svc = new VerifiedOwnerService(
      makeQueueDb(rows),
      { SELLER_PREMIUM_ENABLED: true } as never,
      media,
    );
    const out = await svc.listQueue(['submitted']);
    expect(out[0]?.priorityModeration).toBe(false);
  });
});
