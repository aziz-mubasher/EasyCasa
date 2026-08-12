/**
 * EC-S-T20 — seller inbox helper tests (badge keys, sort/filter query, flag-off).
 */

import { describe, expect, it } from 'vitest';
import { applyInbox, type EnquiryListItem } from '@easycasa/shared';

import {
  buildEnquiriesQuery,
  inboxBadgeLabelKey,
  inboxListingOptions,
  isSellerInboxDisabled,
  type InboxListResponse,
} from './seller-inbox';

describe('isSellerInboxDisabled', () => {
  it('returns true only for 404 (flag off)', () => {
    expect(isSellerInboxDisabled(404)).toBe(true);
    expect(isSellerInboxDisabled(403)).toBe(false);
    expect(isSellerInboxDisabled(200)).toBe(false);
    expect(isSellerInboxDisabled(500)).toBe(false);
  });
});

describe('buildEnquiriesQuery', () => {
  it('serialises sort and filters for the API', () => {
    expect(buildEnquiriesQuery('newest', { badgedOnly: false, unreadOnly: false })).toBe(
      '?sort=newest',
    );
    expect(
      buildEnquiriesQuery('badge_first', {
        listingId: 'abc-123',
        badgedOnly: true,
        unreadOnly: true,
      }),
    ).toBe('?sort=badge_first&listingId=abc-123&badgedOnly=true&unreadOnly=true');
  });
});

describe('inboxBadgeLabelKey (badge render)', () => {
  it('maps display state to sellerInbox.badge.* keys', () => {
    expect(inboxBadgeLabelKey('valid')).toBe('valid');
    expect(inboxBadgeLabelKey('expired')).toBe('expired');
    expect(inboxBadgeLabelKey('none')).toBeNull();
  });
});

describe('inboxListingOptions', () => {
  it('merges perListingUnread keys with item listing ids', () => {
    const response: InboxListResponse = {
      unreadTotal: 2,
      perListingUnread: { L1: 1, L2: 1 },
      items: [
        {
          id: 'e1',
          listingId: 'L3',
          receivedAt: '2026-08-11T08:00:00Z',
          read: false,
          badge: null,
          badgeDisplay: 'none',
          hasViewingRequest: false,
        },
      ],
    };
    expect(inboxListingOptions(response)).toEqual(['L1', 'L2', 'L3']);
  });
});

describe('applyInbox sort/filter (shared reducer)', () => {
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

  it('sorts badge_first and filters badgedOnly like the API', () => {
    const valid = item({
      id: 'v',
      read: true,
      badge: {
        status: 'valid',
        bandMaxCents: 200_000,
        expiresAt: new Date('2026-09-01'),
        holderInitials: 'VR',
      },
    });
    const plain = item({ id: 'p', listingId: 'L2', receivedAt: new Date('2026-08-11T08:00:00Z') });
    const all = [plain, valid];
    expect(applyInbox(all, { badgedOnly: true }, 'newest', NOW).map((i) => i.id)).toEqual(['v']);
    expect(applyInbox(all, {}, 'badge_first', NOW).map((i) => i.id)).toEqual(['v', 'p']);
  });
});
