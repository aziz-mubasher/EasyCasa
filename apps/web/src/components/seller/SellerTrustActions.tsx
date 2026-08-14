'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import {
  listingShowsVerifiedBadge,
  shouldShowChecklistSurface,
  shouldShowVoSurface,
  type SellerListingTrustWire,
  type SellerTrustFlags,
} from '@/lib/seller-trust';

type Props = {
  listingId: string;
  flags: SellerTrustFlags;
  trust: SellerListingTrustWire | null | undefined;
};

/** PP-6 — listing-card links to VO/checklist surfaces when flags on. */
export function SellerTrustActions({ listingId, flags, trust }: Props) {
  const t = useTranslations('sellerTrust.actions');
  const tCard = useTranslations('listingCard');
  const showVo = shouldShowVoSurface(flags);
  const showChecklist = shouldShowChecklistSurface(flags);
  if (!showVo && !showChecklist) return null;

  const verified = listingShowsVerifiedBadge(trust);
  const docScore = trust?.docScore;

  return (
    <div className="space-y-2" data-testid="seller-trust-actions">
      {showVo ? (
        <div className="flex flex-wrap items-center gap-2">
          {verified ? (
            <span className="text-xs font-medium text-azure">{tCard('verifiedOwner')}</span>
          ) : null}
          <Link
            href={`/seller/listings/${listingId}/verification`}
            className="text-sm underline"
          >
            {t('manageVerification')}
          </Link>
        </div>
      ) : null}
      {showChecklist ? (
        <div className="flex flex-wrap items-center gap-2">
          {docScore ? (
            <span className="text-xs text-muted" aria-label={tCard('docsScoreAria', docScore)}>
              {tCard('docsScore', docScore)}
            </span>
          ) : null}
          <Link
            href={`/seller/listings/${listingId}/documents`}
            className="text-sm underline"
          >
            {t('manageDocuments')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
