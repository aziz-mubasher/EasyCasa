'use client';

import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { euro } from '@/lib/format';
import type { SellerListingItemWithTrust } from '@/lib/seller-trust';

import { SellerBoostActions } from './SellerBoostActions';
import { SellerTrustActions } from './SellerTrustActions';

type Props = {
  item: SellerListingItemWithTrust;
  boostEnabled: boolean;
  trustFlags: {
    verifiedOwnerEnabled: boolean;
    sellerChecklistEnabled: boolean;
  };
};

/** PP-5/PP-6 — seller dashboard listing card with boost + trust surfaces. */
export function SellerListingCard({ item, boostEnabled, trustFlags }: Props) {
  const t = useTranslations('sellerMonetisation.myListings');
  const locale = useLocale();
  const hrefSlug = item.slug || item.id;
  const price =
    item.price != null && item.price !== ''
      ? euro(Number(item.price), locale === 'en' ? 'en-GB' : locale === 'es' ? 'es-ES' : 'it-IT')
      : null;

  return (
    <article
      className="rounded-xl2 border border-line bg-paper p-4"
      data-testid={`seller-listing-card-${item.id}`}
    >
      <div className="flex gap-4">
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-sand">
          {item.coverUrl ? (
            <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg truncate">{item.title}</h2>
          <p className="text-sm text-muted truncate">
            {[item.city, price].filter(Boolean).join(' · ')}
          </p>
          <p className="text-xs text-muted mt-1">{t(`status.${item.status}`)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <SellerTrustActions listingId={item.id} flags={trustFlags} trust={item.trust} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SellerBoostActions
            listingId={item.id}
            listingStatus={item.status}
            boostEnabled={boostEnabled}
            boost={item.boost}
          />
          <Link href={`/listings/${hrefSlug}`} className="text-sm underline">
            {t('viewPublic')}
          </Link>
        </div>
      </div>
    </article>
  );
}
