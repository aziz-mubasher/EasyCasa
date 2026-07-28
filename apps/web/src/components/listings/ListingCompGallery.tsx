'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

/** Comp-03 gallery: large main + two side tiles (second shows +N when more photos). */
export function ListingCompGallery({ title, urls }: { title: string; urls: string[] }) {
  const t = useTranslations('listingDetail.gallery');
  const [index, setIndex] = useState(0);
  const total = urls.length;
  const main = total > 0 ? urls[Math.min(index, total - 1)] : null;
  const sideA = total > 1 ? urls[1] : null;
  const moreCount = total > 2 ? total - 2 : 0;

  if (total === 0) {
    return (
      <div className="ld-gal" aria-label={t('regionLabel')}>
        <div className="ld-gal-main">
          <span className="data text-xs tracking-widest uppercase text-ink-soft">{t('noPhotos')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ld-gal" aria-label={t('regionLabel')}>
      <button
        type="button"
        className="ld-gal-main"
        onClick={() => setIndex(0)}
        aria-label={t('selectPhoto', { n: 1 })}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={main!} alt={t('photoAlt', { title, n: 1 })} />
      </button>
      {total > 1 ? (
        <div className="ld-gal-side">
          <button
            type="button"
            className="ld-gal-ph"
            onClick={() => setIndex(1)}
            aria-label={t('selectPhoto', { n: 2 })}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sideA!} alt={t('photoAlt', { title, n: 2 })} />
          </button>
          <button
            type="button"
            className="ld-gal-ph"
            onClick={() => setIndex(moreCount > 0 ? 2 : 1)}
            aria-label={
              moreCount > 0 ? t('photoCounter', { current: 3, total }) : t('selectPhoto', { n: 2 })
            }
          >
            {moreCount > 0 && urls[2] ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[2]} alt="" />
                <span className="ld-gal-more">+ {total - 2}</span>
              </>
            ) : sideA ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sideA} alt={t('photoAlt', { title, n: 2 })} />
            ) : null}
          </button>
        </div>
      ) : null}
    </div>
  );
}
