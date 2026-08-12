/**
 * EC-S-T20 — seller enquiry inbox helpers (web).
 * Sort/filter query building + badge copy keys; domain reducers live in @easycasa/shared.
 */

import type { BadgeDisplayState, InboxSort } from '@easycasa/shared';

export type InboxBadgeApi = {
  status: 'valid' | 'revoked';
  bandMaxCents: number;
  expiresAt: string;
  holderInitials: string;
};

export type InboxItemApi = {
  id: string;
  listingId: string;
  receivedAt: string;
  read: boolean;
  badge: InboxBadgeApi | null;
  badgeDisplay: BadgeDisplayState;
  hasViewingRequest: boolean;
};

export type InboxListResponse = {
  items: InboxItemApi[];
  unreadTotal: number;
  perListingUnread: Record<string, number>;
};

export type InboxUiFilter = {
  listingId?: string;
  badgedOnly: boolean;
  unreadOnly: boolean;
};

/** Fail closed when the seller-inbox feature flag is off (API returns 404). */
export function isSellerInboxDisabled(status: number): boolean {
  return status === 404;
}

export function buildEnquiriesQuery(
  sort: InboxSort,
  filter: InboxUiFilter,
): string {
  const params = new URLSearchParams();
  params.set('sort', sort);
  if (filter.listingId) params.set('listingId', filter.listingId);
  if (filter.badgedOnly) params.set('badgedOnly', 'true');
  if (filter.unreadOnly) params.set('unreadOnly', 'true');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** i18n key under sellerInbox.badge.* for the effective badge state. */
export function inboxBadgeLabelKey(
  badgeDisplay: BadgeDisplayState,
): 'valid' | 'expired' | null {
  if (badgeDisplay === 'valid') return 'valid';
  if (badgeDisplay === 'expired') return 'expired';
  return null;
}

export function formatInboxBandMax(cents: number, locale: string): string {
  const euros = Math.round(cents / 100);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(euros);
  } catch {
    return `€${euros.toLocaleString('it-IT')}`;
  }
}

export function formatInboxReceivedAt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatBadgeExpiresAt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/** Listing ids for the per-listing filter (unread tallies + visible items). */
export function inboxListingOptions(
  response: InboxListResponse | null,
): string[] {
  if (!response) return [];
  const ids = new Set<string>();
  for (const id of Object.keys(response.perListingUnread)) ids.add(id);
  for (const item of response.items) ids.add(item.listingId);
  return [...ids].sort();
}
