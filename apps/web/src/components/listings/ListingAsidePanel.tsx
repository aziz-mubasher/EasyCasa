'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ContactEnquiryForm } from '@/components/listings/ContactEnquiryForm';
import { useFavorites } from '@/favorites/FavoritesProvider';

type Props = {
  listingId: string;
  listingSlug: string;
  listingTitle: string;
  sellerType: string | null;
  agentName: string | null;
};

/** Sticky aside: owner identity, CTAs, no-commission note (comp-03 — no agency chrome). */
export function ListingAsidePanel({
  listingId,
  listingSlug,
  listingTitle,
  sellerType,
  agentName,
}: Props) {
  const t = useTranslations('listingDetail');
  const tf = useTranslations('search.filters');
  const { isFavorite, toggleFavorite, ready } = useFavorites();
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const saved = isFavorite(listingId);

  const isPrivate = sellerType !== 'agency';
  const who = isPrivate
    ? t('aside.privateOwner')
    : (agentName ?? tf('sellerType.agency'));
  const role = isPrivate ? t('aside.privateRole') : t('aside.agencyRole');

  return (
    <aside>
      <div className="ld-panel">
        <div className="in">
          <div className="ld-owner">
            <span className="av" aria-hidden />
            <span>
              <span className="who">{who}</span>
              <span className="role">{role}</span>
            </span>
          </div>

          {!enquiryOpen ? (
            <button type="button" className="ld-cta" onClick={() => setEnquiryOpen(true)}>
              {t('contact.cta')}
            </button>
          ) : null}

          <Link href={`/listings/${listingSlug}/book`} className="ld-cta ghost">
            {t('contact.bookViewing')}
          </Link>

          <button
            type="button"
            className="ld-cta ghost"
            disabled={!ready}
            onClick={() => void toggleFavorite(listingId)}
            aria-pressed={saved}
          >
            {saved ? t('aside.saved') : t('aside.save')}
          </button>

          {enquiryOpen ? (
            <div className="mt-4 border-t border-line pt-4">
              <ContactEnquiryForm
                listingId={listingId}
                listingTitle={listingTitle}
                className="space-y-3"
              />
              <button
                type="button"
                className="mt-3 text-sm text-ink-soft hover:text-azure"
                onClick={() => setEnquiryOpen(false)}
              >
                {t('contact.close')}
              </button>
            </div>
          ) : null}

          <div className="ld-freefee">
            <b>{t('aside.freefeeTitle')}</b>
            {t('aside.freefeeBody')}
          </div>
        </div>
      </div>

      <div className="ld-ref">
        <span>{t('aside.refLabel')}</span>
        <span>{listingSlug}</span>
      </div>
    </aside>
  );
}
