import { describe, expect, it } from 'vitest';

import {
  assertCanCreateShareLink,
  canManageShareLink,
  ShareLinkAuthError,
} from './authorization';

const listing = {
  ownerUserId: 'owner-1',
  agentId: 'agent-1',
  mediatorUserId: 'med-1' as string | null,
};

describe('share-link authorization', () => {
  it('allows listing owner without product role', () => {
    expect(() =>
      assertCanCreateShareLink(
        { sub: 'owner-1', roles: ['buyer'] },
        'owner-1',
        listing,
      ),
    ).not.toThrow();
  });

  it('allows assigned agent with agent role', () => {
    expect(() =>
      assertCanCreateShareLink(
        { sub: 'agent-1', roles: ['agent'] },
        'agent-1',
        listing,
      ),
    ).not.toThrow();
  });

  it('rejects seller role without listing assignment', () => {
    expect(() =>
      assertCanCreateShareLink(
        { sub: 'rando', roles: ['seller'] },
        'rando',
        listing,
      ),
    ).toThrow(ShareLinkAuthError);
    try {
      assertCanCreateShareLink({ sub: 'rando', roles: ['seller'] }, 'rando', listing);
    } catch (e) {
      expect((e as ShareLinkAuthError).code).toBe('not authorized for this listing');
    }
  });

  it('rejects buyer without ownership', () => {
    expect(() =>
      assertCanCreateShareLink(
        { sub: 'seeker', roles: ['buyer'] },
        'seeker',
        listing,
      ),
    ).toThrow(ShareLinkAuthError);
    try {
      assertCanCreateShareLink({ sub: 'seeker', roles: ['buyer'] }, 'seeker', listing);
    } catch (e) {
      expect((e as ShareLinkAuthError).code).toBe('insufficient role');
    }
  });

  it('manage: creator, owner, mediator, admin — not random seller', () => {
    const link = { createdBy: 'creator', listingId: 'l1' };
    expect(
      canManageShareLink({ sub: 'creator', roles: ['seller'] }, 'creator', link, listing),
    ).toBe(true);
    expect(
      canManageShareLink({ sub: 'owner-1', roles: ['buyer'] }, 'owner-1', link, listing),
    ).toBe(true);
    expect(
      canManageShareLink({ sub: 'med-1', roles: ['agent'] }, 'med-1', link, listing),
    ).toBe(true);
    expect(
      canManageShareLink({ sub: 'admin', roles: ['admin'] }, 'admin', link, listing),
    ).toBe(true);
    expect(
      canManageShareLink({ sub: 'other', roles: ['seller'] }, 'other', link, listing),
    ).toBe(false);
  });
});
