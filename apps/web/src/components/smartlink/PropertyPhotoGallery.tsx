'use client';

import { useRef, useState, type MouseEvent } from 'react';
import { useTranslations } from 'next-intl';

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d={dir === 'left' ? 'M15 6 9 12l6 6' : 'M9 6l6 6-6 6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PropertyPhotoGallery({
  title,
  urls,
}: {
  title: string;
  urls: string[];
}) {
  const t = useTranslations('smartlink');
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (urls.length === 0) {
    return (
      <div className="aspect-[16/10] rounded-xl2 border border-line bg-sand flex items-center justify-center text-muted">
        {t('noPhotos')}
      </div>
    );
  }

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || urls.length < 2) return;
    const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    setActive(Math.min(Math.max(i, 0), urls.length - 1));
  };

  const go = (dir: -1 | 1) => (e: MouseEvent) => {
    e.preventDefault();
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="relative aspect-[16/10] rounded-xl2 overflow-hidden border border-line bg-sand group/gallery">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {urls.map((url, i) => (
          <img
            key={`${url}-${i}`}
            src={url}
            alt={i === 0 ? title : t('photoAlt', { title, n: i + 1 })}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            className="h-full w-full min-w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>
      {urls.length > 1 && (
        <>
          <button
            type="button"
            aria-label={t('prevPhoto')}
            onClick={go(-1)}
            disabled={active === 0}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-paper/90 text-ink shadow-sm opacity-0 transition-opacity enabled:hover:bg-paper group-hover/gallery:opacity-100 group-hover/gallery:disabled:opacity-40"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            aria-label={t('nextPhoto')}
            onClick={go(1)}
            disabled={active === urls.length - 1}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-paper/90 text-ink shadow-sm opacity-0 transition-opacity enabled:hover:bg-paper group-hover/gallery:opacity-100 group-hover/gallery:disabled:opacity-40"
          >
            <Chevron dir="right" />
          </button>
          <p className="absolute bottom-3 right-3 rounded-full bg-ink/75 px-3 py-1 text-xs text-paper data">
            {t('photoCounter', { current: active + 1, total: urls.length })}
          </p>
        </>
      )}
    </div>
  );
}
