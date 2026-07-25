'use client';

import type { MouseEvent } from 'react';
import { useTranslations } from 'next-intl';

import { useFavorites } from '@/favorites/FavoritesProvider';

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill={filled ? 'currentColor' : 'none'}>
      <path
        d="M12 21s-8-4.5-8-11a5 5 0 0 1 9-2.5A5 5 0 0 1 20 10c0 6.5-8 11-8 11Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  listingId: string;
  /** Larger hit target on listing detail header. */
  size?: 'sm' | 'md';
  className?: string;
};

export function FavoriteToggle({ listingId, size = 'sm', className = '' }: Props) {
  const t = useTranslations('favorites');
  const { isFavorite, toggleFavorite, ready } = useFavorites();
  const saved = isFavorite(listingId);

  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void toggleFavorite(listingId);
  };

  const dim = size === 'md' ? 'h-10 w-10' : 'h-9 w-9';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!ready}
      aria-pressed={saved}
      aria-label={saved ? t('removeFavorite') : t('saveFavorite')}
      className={`grid ${dim} place-items-center rounded-full border border-line bg-paper/95 text-ink shadow-sm transition hover:border-azure hover:text-azure disabled:opacity-60 ${className}`}
    >
      <HeartIcon filled={saved} />
    </button>
  );
}
