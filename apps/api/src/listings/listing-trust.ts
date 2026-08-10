import { badgeActive, type VoState } from '@easycasa/shared';
import type { ListingSummary } from '@easycasa/shared';

/** EC-S-T17 — map raw VO/checklist/publish fields onto ListingSummary.trust. */
export function buildListingTrust(input: {
  voState: string | null;
  docHave: number | null;
  docTotal: number | null;
  hasSellerProfile: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  now?: Date;
}): NonNullable<ListingSummary['trust']> {
  const now = input.now ?? new Date();
  const start = input.publishedAt ?? input.createdAt;
  const daysOnMarket = Math.max(
    0,
    Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
  );
  const verifiedOwner = input.voState ? badgeActive(input.voState as VoState) : false;
  const trust: NonNullable<ListingSummary['trust']> = {
    verifiedOwner,
    listedByOwner: input.hasSellerProfile,
    daysOnMarket,
  };
  if (input.docHave != null && input.docTotal != null && input.docTotal > 0) {
    trust.docScore = { have: input.docHave, total: input.docTotal };
  }
  return trust;
}
