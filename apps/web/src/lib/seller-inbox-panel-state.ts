import type { InboxSort } from '@easycasa/shared';

/** Wire shape from GET /seller/enquiries (no message body / contact fields). */
export type SellerInboxItemWire = {
  id: string;
  listingId: string;
  receivedAt: string;
  read: boolean;
  badge: {
    status: 'valid' | 'revoked';
    bandMaxCents: number;
    expiresAt: string;
    holderInitials: string;
  } | null;
  hasViewingRequest: boolean;
  badgeDisplay: 'valid' | 'expired' | 'none';
};

export type SellerInboxListResponse = {
  items: SellerInboxItemWire[];
  unreadTotal: number;
  perListingUnread: Record<string, number>;
};

export type InboxPanelState =
  | 'signIn'
  | 'loading'
  | 'unavailable'
  | 'error'
  | 'empty'
  | 'ready';

export function resolveInboxPanelState(params: {
  ready: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  itemCount: number;
}): InboxPanelState {
  if (params.ready && !params.isAuthenticated) return 'signIn';
  if (params.loading) return 'loading';
  if (params.error === 'unavailable') return 'unavailable';
  if (params.error) return 'error';
  if (params.itemCount === 0) return 'empty';
  return 'ready';
}

export function buildEnquiriesQuery(params: {
  sort: InboxSort;
  badgedOnly: boolean;
  unreadOnly: boolean;
}): string {
  const q = new URLSearchParams();
  q.set('sort', params.sort);
  if (params.badgedOnly) q.set('badgedOnly', 'true');
  if (params.unreadOnly) q.set('unreadOnly', 'true');
  return q.toString();
}

export function formatBandAmount(cents: number, locale: string): string {
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

export function formatReceivedAt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Rome',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
