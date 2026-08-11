/** EC-S-T20 — enquiry inbox reducer tests. */

import { describe, expect, it } from 'vitest';
import {
  applyInbox,
  badgeDisplayState,
  perListingUnread,
  unreadCount,
  type EnquiryListItem,
} from '@easycasa/shared';

const NOW = new Date('2026-08-11T12:00:00Z');

function item(partial: Partial<EnquiryListItem> & Pick<EnquiryListItem, 'id'>): EnquiryListItem {
  return {
    listingId: 'L1',
    receivedAt: new Date('2026-08-10T12:00:00Z'),
    read: false,
    badge: null,
    hasViewingRequest: false,
    ...partial,
  };
}

describe('badgeDisplayState', () => {
  it('none without badge; none when revoked; expired when past expiresAt', () => {
    expect(badgeDisplayState(item({ id: 'a' }), NOW)).toBe('none');
    expect(
      badgeDisplayState(
        item({
          id: 'b',
          badge: {
            status: 'revoked',
            bandMaxCents: 100,
            expiresAt: new Date('2026-09-01'),
            holderInitials: 'AB',
          },
        }),
        NOW,
      ),
    ).toBe('none');
    expect(
      badgeDisplayState(
        item({
          id: 'c',
          badge: {
            status: 'valid',
            bandMaxCents: 100,
            expiresAt: new Date('2026-08-01'),
            holderInitials: 'AB',
          },
        }),
        NOW,
      ),
    ).toBe('expired');
    expect(
      badgeDisplayState(
        item({
          id: 'd',
          badge: {
            status: 'valid',
            bandMaxCents: 100,
            expiresAt: new Date('2026-09-01'),
            holderInitials: 'AB',
          },
        }),
        NOW,
      ),
    ).toBe('valid');
  });
});

describe('applyInbox', () => {
  const valid = item({
    id: 'v',
    listingId: 'L1',
    read: true,
    receivedAt: new Date('2026-08-09T12:00:00Z'),
    badge: {
      status: 'valid',
      bandMaxCents: 200_000,
      expiresAt: new Date('2026-09-01'),
      holderInitials: 'VR',
    },
  });
  const unread = item({
    id: 'u',
    listingId: 'L2',
    read: false,
    receivedAt: new Date('2026-08-11T08:00:00Z'),
  });
  const revoked = item({
    id: 'r',
    listingId: 'L1',
    read: false,
    receivedAt: new Date('2026-08-10T08:00:00Z'),
    badge: {
      status: 'revoked',
      bandMaxCents: 1,
      expiresAt: new Date('2026-09-01'),
      holderInitials: 'XX',
    },
  });

  it('filters listing / unread / badgedOnly', () => {
    const all = [valid, unread, revoked];
    expect(applyInbox(all, { listingId: 'L1' }, 'newest', NOW).map((i) => i.id)).toEqual([
      'r',
      'v',
    ]);
    expect(applyInbox(all, { unreadOnly: true }, 'newest', NOW).map((i) => i.id)).toEqual([
      'u',
      'r',
    ]);
    expect(applyInbox(all, { badgedOnly: true }, 'newest', NOW).map((i) => i.id)).toEqual(['v']);
  });

  it('sorts badge_first and unread_first', () => {
    const all = [unread, valid, revoked];
    expect(applyInbox(all, {}, 'badge_first', NOW).map((i) => i.id)).toEqual(['v', 'u', 'r']);
    expect(applyInbox(all, {}, 'unread_first', NOW).map((i) => i.id)[0]).toBe('u');
  });

  it('does not mutate input', () => {
    const all = [valid, unread];
    const copy = all.slice();
    applyInbox(all, {}, 'newest', NOW);
    expect(all).toEqual(copy);
  });
});

describe('unread helpers', () => {
  it('unreadCount and perListingUnread', () => {
    const items = [
      item({ id: '1', listingId: 'A', read: false }),
      item({ id: '2', listingId: 'A', read: false }),
      item({ id: '3', listingId: 'B', read: true }),
    ];
    expect(unreadCount(items)).toBe(2);
    expect(Object.fromEntries(perListingUnread(items))).toEqual({ A: 2 });
  });
});
