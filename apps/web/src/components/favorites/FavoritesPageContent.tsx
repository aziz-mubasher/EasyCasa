'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

import { useAuth } from '@/auth/AuthProvider';
import { createAuthedFetch } from '@/auth/authedFetch';
import { Button } from '@/components/ui/Button';
import { ListingCard } from '@/components/listing/ListingCard';
import { FavoriteToggle } from '@/favorites/FavoriteToggle';
import { useFavorites } from '@/favorites/FavoritesProvider';
import {
  deleteSavedSearch,
  fetchFavorites,
  fetchSavedSearches,
  setSavedSearchFrequency,
  type AlertFrequency,
  type SavedSearchRow,
} from '@/lib/me-api';
import { searchHrefFromSavedCriteria } from '@/lib/saved-search-url';
import type { ListingSummary } from '@easycasa/shared';

function SavedSearchItem({
  row,
  onChanged,
}: {
  row: SavedSearchRow;
  onChanged: () => void;
}) {
  const t = useTranslations('favorites.savedSearches');
  const { getAccessToken } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const [busy, setBusy] = useState(false);

  const href = searchHrefFromSavedCriteria(row.criteria);
  const summary =
    typeof row.criteria.webParams === 'object' && row.criteria.webParams
      ? row.name
      : row.name;

  const setFreq = async (frequency: AlertFrequency) => {
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      await setSavedSearchFrequency(authedFetch, token, row.id, frequency);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      await deleteSavedSearch(authedFetch, token, row.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const freqs: AlertFrequency[] = ['off', 'daily', 'instant'];

  return (
    <li className="rounded-xl2 border border-line bg-paper p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-medium text-ink">{summary}</p>
          <Link
            href={href}
            className="text-sm text-azure underline hover:no-underline mt-1 inline-block"
          >
            {t('rerun')}
          </Link>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDelete()}
          className="text-sm text-muted hover:text-ink underline disabled:opacity-50"
        >
          {t('delete')}
        </button>
      </div>
      <div>
        <p className="text-xs text-muted mb-2">{t('frequencyLabel')}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('frequencyLabel')}>
          {freqs.map((f) => {
            const selected = row.frequency === f;
            return (
              <button
                key={f}
                type="button"
                disabled={busy}
                aria-pressed={selected}
                onClick={() => void setFreq(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                  selected
                    ? 'border-azure bg-azure/10 text-azure'
                    : 'border-line text-ink hover:border-azure'
                } disabled:opacity-50`}
              >
                {t(`freq.${f}`)}
              </button>
            );
          })}
        </div>
        {row.frequency !== 'off' ? (
          <p className="text-xs text-muted mt-2">{t('emailNotActive')}</p>
        ) : null}
      </div>
    </li>
  );
}

export function FavoritesPageContent() {
  const t = useTranslations('favorites');
  const { ready, isAuthenticated, signIn, getAccessToken } = useAuth();
  const pathname = usePathname();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const { refresh: refreshFavoriteIds } = useFavorites();

  const [tab, setTab] = useState<'listings' | 'searches'>('listings');
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [searches, setSearches] = useState<SavedSearchRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const [fav, ss] = await Promise.all([
        fetchFavorites(authedFetch, token),
        fetchSavedSearches(authedFetch, token),
      ]);
      setListings(fav);
      setSearches(ss);
      await refreshFavoriteIds();
    } finally {
      setLoading(false);
    }
  }, [authedFetch, getAccessToken, isAuthenticated, refreshFavoriteIds]);

  useEffect(() => {
    if (!ready) return;
    if (isAuthenticated) void load();
    else {
      setListings([]);
      setSearches([]);
    }
  }, [ready, isAuthenticated, load]);

  if (!ready) {
    return <p className="text-muted mt-3">{t('loading')}</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="mt-6 space-y-4 max-w-lg">
        <p className="text-muted">{t('signInPrompt')}</p>
        <Button type="button" onClick={() => void signIn(pathname)}>
          {t('signInCta')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex gap-2 border-b border-line" role="tablist" aria-label={t('tabsLabel')}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'listings'}
          id="tab-listings"
          aria-controls="panel-listings"
          onClick={() => setTab('listings')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'listings' ? 'border-azure text-ink' : 'border-transparent text-muted'
          }`}
        >
          {t('tabListings')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'searches'}
          id="tab-searches"
          aria-controls="panel-searches"
          onClick={() => setTab('searches')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'searches' ? 'border-azure text-ink' : 'border-transparent text-muted'
          }`}
        >
          {t('tabSearches')}
        </button>
      </div>

      {loading ? <p className="text-muted">{t('loading')}</p> : null}

      {tab === 'listings' ? (
        <div
          role="tabpanel"
          id="panel-listings"
          aria-labelledby="tab-listings"
          hidden={tab !== 'listings'}
        >
          {listings.length === 0 && !loading ? (
            <div className="py-16 text-center space-y-4">
              <p className="text-muted">{t('emptyListings')}</p>
              <Link href="/search">
                <Button variant="outline">{t('emptyListingsCta')}</Button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((l) => (
                <div key={l.id} className="relative">
                  <div className="absolute top-3 right-3 z-10">
                    <FavoriteToggle listingId={l.id} />
                  </div>
                  <ListingCard l={l} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'searches' ? (
        <div
          role="tabpanel"
          id="panel-searches"
          aria-labelledby="tab-searches"
          hidden={tab !== 'searches'}
        >
          {searches.length === 0 && !loading ? (
            <div className="py-16 text-center space-y-4">
              <p className="text-muted">{t('emptySearches')}</p>
              <Link href="/search">
                <Button variant="outline">{t('emptySearchesCta')}</Button>
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {searches.map((row) => (
                <SavedSearchItem key={row.id} row={row} onChanged={() => void load()} />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
