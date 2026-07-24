'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  LocationTypeahead,
  emptyLocationSelection,
  locationSelectionToParams,
  type LocationSelection,
} from './LocationTypeahead';
import { useSearchUrlState } from './useSearchUrlState';

const SEARCH_PATH = '/search';

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('search');
  const { get, setMany } = useSearchUrlState();
  const [location, setLocation] = useState<LocationSelection>(() => ({
    ...emptyLocationSelection(),
    query: get('q') || get('city') || '',
    city: get('city') || null,
    provinceSlug: get('provinceSlug') || null,
    regionSlug: get('regionSlug') || null,
    q: get('q') || null,
  }));
  const onSelect = useCallback(
    (sel: LocationSelection) => {
      setLocation(sel);
      setMany(locationSelectionToParams(sel), true, SEARCH_PATH);
    },
    [setMany],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = location.query.trim();
    const updates = trimmed
      ? location.city || location.provinceSlug || location.regionSlug
        ? locationSelectionToParams({ ...location, query: trimmed })
        : { q: trimmed, city: null, provinceSlug: null, regionSlug: null }
      : locationSelectionToParams(emptyLocationSelection());
    setMany(updates, true, SEARCH_PATH);
  };

  return (
    <div className={`relative ${compact ? 'w-full' : 'w-full max-w-2xl'}`}>
      <form onSubmit={onSubmit} role="search" aria-label={t('searchPlaceholder')}>
        <div
          className={`relative flex items-center rounded-xl border border-line bg-paper ${compact ? 'shadow-sm' : 'shadow-md'}`}
        >
          <LocationTypeahead
            value={location.query}
            onChange={(query) =>
              setLocation((prev) => ({
                ...prev,
                query,
                city: null,
                provinceSlug: null,
                regionSlug: null,
                q: null,
              }))
            }
            onSelect={onSelect}
            ariaLabel={t('searchPlaceholder')}
            className="w-full"
            showSearchIcon
          />
          <button
            type="submit"
            className="mr-2 shrink-0 rounded-full bg-azure text-paper px-4 py-2 text-sm font-medium hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure"
          >
            {t('searchButton')}
          </button>
        </div>
      </form>
    </div>
  );
}
