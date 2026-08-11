import {
  badgeActive,
  daysOnMarket as daysOnMarketFromRecord,
  showDaysOnMarket,
  type PublishRecord,
  type PublishState,
  type VoState,
} from '@easycasa/shared';
import type { ListingSummary } from '@easycasa/shared';

/** Map DB listing_status onto publish-lifecycle states. */
export function publishStateFromListingStatus(status: string): PublishState {
  if (status === 'published') return 'published';
  if (status === 'unpublished') return 'unpublished';
  return 'draft';
}

export function listingToPublishRecord(row: {
  status: string;
  firstPublishedAt: Date | null;
  publishedAt: Date | null;
  unpublishedAt: Date | null;
}): PublishRecord {
  return {
    state: publishStateFromListingStatus(row.status),
    firstPublishedAt: row.firstPublishedAt,
    lastPublishedAt: row.publishedAt,
    unpublishedAt: row.unpublishedAt,
  };
}

/**
 * EC-S-T17 + T13 — trust payload for ListingSummary.
 * daysOnMarket uses sticky first_published_at (then publishedAt, then createdAt for
 * pre-migration published rows). Chip only when listing is currently published.
 */
export function buildListingTrust(input: {
  voState: string | null;
  docHave: number | null;
  docTotal: number | null;
  hasSellerProfile: boolean;
  status: string;
  firstPublishedAt: Date | null;
  publishedAt: Date | null;
  unpublishedAt: Date | null;
  createdAt: Date;
  now?: Date;
}): NonNullable<ListingSummary['trust']> {
  const now = input.now ?? new Date();
  const sticky =
    input.firstPublishedAt ??
    input.publishedAt ??
    (input.status === 'published' ? input.createdAt : null);

  const rec: PublishRecord = {
    state: publishStateFromListingStatus(input.status),
    firstPublishedAt: sticky,
    lastPublishedAt: input.publishedAt,
    unpublishedAt: input.unpublishedAt,
  };

  const days = showDaysOnMarket(rec) ? (daysOnMarketFromRecord(rec, now) ?? 0) : 0;
  const verifiedOwner = input.voState ? badgeActive(input.voState as VoState) : false;
  const trust: NonNullable<ListingSummary['trust']> = {
    verifiedOwner,
    listedByOwner: input.hasSellerProfile,
    daysOnMarket: days,
    showDaysOnMarket: showDaysOnMarket(rec),
  };
  if (input.docHave != null && input.docTotal != null && input.docTotal > 0) {
    trust.docScore = { have: input.docHave, total: input.docTotal };
  }
  return trust;
}
