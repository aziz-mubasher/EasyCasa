'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
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

export function ListingPhotoGallery({ title, urls }: { title: string; urls: string[] }) {
  const t = useTranslations('listingDetail.gallery');
  const dialogTitleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const total = urls.length;
  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;

  const go = useCallback(
    (delta: -1 | 1) => {
      if (total < 2) return;
      setIndex((i) => Math.min(Math.max(i + delta, 0), total - 1));
    },
    [total],
  );

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const thumb = el.children[safeIndex] as HTMLElement | undefined;
    thumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [safeIndex]);

  useEffect(() => {
    if (!lightbox) return;
    closeRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const onGalleryKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (total > 0) setLightbox(true);
    }
  };

  const navClick = (dir: -1 | 1) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    go(dir);
  };

  if (total === 0) {
    return (
      <div
        className="aspect-[16/10] rounded-xl2 border border-dashed border-line bg-sand/60 flex flex-col items-center justify-center gap-2 text-muted"
        role="img"
        aria-label={t('noPhotos')}
      >
        <span className="font-display text-lg text-ink/40">EasyCasa</span>
        <p className="text-sm">{t('noPhotos')}</p>
      </div>
    );
  }

  const heroUrl = urls[safeIndex]!;

  return (
    <>
      <div className="space-y-3">
        <div
          className="group/hero relative aspect-[16/10] overflow-hidden rounded-xl2 border border-line bg-sand"
          tabIndex={0}
          role="region"
          aria-label={t('regionLabel')}
          onKeyDown={onGalleryKeyDown}
        >
          <button
            type="button"
            className="block h-full w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure"
            onClick={() => setLightbox(true)}
            aria-label={t('openLightbox')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroUrl}
              alt={safeIndex === 0 ? title : t('photoAlt', { title, n: safeIndex + 1 })}
              loading={safeIndex === 0 ? 'eager' : 'lazy'}
              fetchPriority={safeIndex === 0 ? 'high' : 'auto'}
              decoding="async"
              draggable={false}
              className="h-full w-full object-cover"
            />
          </button>
          {total > 1 && (
            <>
              <button
                type="button"
                aria-label={t('prevPhoto')}
                onClick={navClick(-1)}
                disabled={safeIndex === 0}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-paper/90 text-ink shadow-sm transition-opacity enabled:hover:bg-paper disabled:opacity-40 opacity-100 md:opacity-0 md:group-hover/hero:opacity-100 md:group-hover/hero:disabled:opacity-40"
              >
                <Chevron dir="left" />
              </button>
              <button
                type="button"
                aria-label={t('nextPhoto')}
                onClick={navClick(1)}
                disabled={safeIndex >= total - 1}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-paper/90 text-ink shadow-sm transition-opacity enabled:hover:bg-paper disabled:opacity-40 opacity-100 md:opacity-0 md:group-hover/hero:opacity-100 md:group-hover/hero:disabled:opacity-40"
              >
                <Chevron dir="right" />
              </button>
              <p className="absolute bottom-3 right-3 rounded-full bg-ink/75 px-3 py-1 text-xs text-paper data">
                {t('photoCounter', { current: safeIndex + 1, total })}
              </p>
            </>
          )}
        </div>

        {total > 1 && (
          <div
            ref={stripRef}
            className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
            role="list"
            aria-label={t('thumbnails')}
          >
            {urls.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                role="listitem"
                aria-label={t('selectPhoto', { n: i + 1 })}
                aria-current={i === safeIndex ? 'true' : undefined}
                onClick={() => setIndex(i)}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  i === safeIndex ? 'border-azure' : 'border-line hover:border-ink/40'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
          onClick={(e) => {
            if (e.target === dialogRef.current) setLightbox(false);
          }}
        >
          <p id={dialogTitleId} className="sr-only">
            {t('lightboxTitle', { title })}
          </p>
          <button
            ref={closeRef}
            type="button"
            className="absolute right-4 top-4 rounded-full bg-paper/10 px-4 py-2 text-sm text-paper hover:bg-paper/20"
            onClick={() => setLightbox(false)}
          >
            {t('closeLightbox')}
          </button>
          {total > 1 && (
            <>
              <button
                type="button"
                aria-label={t('prevPhoto')}
                className="absolute left-4 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-paper/15 text-paper"
                onClick={navClick(-1)}
              >
                <Chevron dir="left" />
              </button>
              <button
                type="button"
                aria-label={t('nextPhoto')}
                className="absolute right-4 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-paper/15 text-paper"
                onClick={navClick(1)}
              >
                <Chevron dir="right" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroUrl}
            alt={t('photoAlt', { title, n: safeIndex + 1 })}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        </div>
      ) : null}
    </>
  );
}
