/**
 * EC-S-T20 — Seller enquiry inbox reducers (@easycasa/shared).
 *
 * Badge data is the EC-1 four-field attestation — T04 matrix row 6:
 * orders/filters only; expiry computed against `now`, never trusted stale.
 */

export interface EnquiryBadge {
  status: 'valid' | 'revoked';
  bandMaxCents: number;
  expiresAt: Date;
  holderInitials: string;
}

export interface EnquiryListItem {
  id: string;
  listingId: string;
  receivedAt: Date;
  read: boolean;
  badge: EnquiryBadge | null;
  hasViewingRequest: boolean;
}

export type BadgeDisplayState = 'valid' | 'expired' | 'none';

export type InboxSort = 'newest' | 'badge_first' | 'unread_first';

export interface InboxFilter {
  listingId?: string;
  badgedOnly?: boolean;
  unreadOnly?: boolean;
}

/** Effective badge state at `now` — expiry and revocation both collapse to non-valid. */
export function badgeDisplayState(item: EnquiryListItem, now: Date): BadgeDisplayState {
  if (!item.badge) return 'none';
  if (item.badge.status === 'revoked') return 'none';
  return item.badge.expiresAt.getTime() > now.getTime() ? 'valid' : 'expired';
}

const BADGE_ORDER: Record<BadgeDisplayState, number> = { valid: 0, expired: 1, none: 2 };

function byNewest(a: EnquiryListItem, b: EnquiryListItem): number {
  const d = b.receivedAt.getTime() - a.receivedAt.getTime();
  return d !== 0 ? d : a.id.localeCompare(b.id);
}

/** Filter + sort. Returns a new array; input order is never mutated. */
export function applyInbox(
  items: readonly EnquiryListItem[],
  filter: InboxFilter,
  sort: InboxSort,
  now: Date,
): EnquiryListItem[] {
  let out = items.filter((i) => {
    if (filter.listingId !== undefined && i.listingId !== filter.listingId) return false;
    if (filter.unreadOnly && i.read) return false;
    if (filter.badgedOnly && badgeDisplayState(i, now) !== 'valid') return false;
    return true;
  });

  switch (sort) {
    case 'newest':
      out = out.slice().sort(byNewest);
      break;
    case 'badge_first':
      out = out.slice().sort((a, b) => {
        const d = BADGE_ORDER[badgeDisplayState(a, now)] - BADGE_ORDER[badgeDisplayState(b, now)];
        return d !== 0 ? d : byNewest(a, b);
      });
      break;
    case 'unread_first':
      out = out.slice().sort((a, b) => {
        const d = Number(a.read) - Number(b.read);
        return d !== 0 ? d : byNewest(a, b);
      });
      break;
  }
  return out;
}

export function unreadCount(items: readonly EnquiryListItem[]): number {
  return items.reduce((n, i) => n + (i.read ? 0 : 1), 0);
}

/** Per-listing unread tallies for the dashboard listing switcher. */
export function perListingUnread(items: readonly EnquiryListItem[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const i of items) {
    if (!i.read) m.set(i.listingId, (m.get(i.listingId) ?? 0) + 1);
  }
  return m;
}
