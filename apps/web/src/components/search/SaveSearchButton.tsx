'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';

import { useAuth } from '@/auth/AuthProvider';
import { createAuthedFetch } from '@/auth/authedFetch';
import { Button } from '@/components/ui/Button';
import { ITALIAN_PROVINCES, REGION_NAMES } from '@easycasa/shared';
import {
  buildSavedSearchCriteriaFromUrl,
  readSearchParamsFromUrl,
  summarizeSearchParams,
} from '@/lib/saved-search-url';
import { createSavedSearch } from '@/lib/me-api';

const PENDING_SAVE_SEARCH_KEY = 'easycasa_pending_saved_search';

export function SaveSearchButton() {
  const t = useTranslations('favorites.saveSearch');
  const tSummary = useTranslations('favorites.saveSearch.summary');
  const searchParams = useSearchParams();
  const { ready, isAuthenticated, getAccessToken, signIn } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<'success' | null>(null);

  const urlParams = useMemo(
    () => readSearchParamsFromUrl(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const runSave = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    setMessage(null);
    try {
      const name = summarizeSearchParams(
        urlParams,
        {
          allListings: tSummary('allListings'),
          sale: tSummary('sale'),
          rent: tSummary('rent'),
          upToPrice: (max) => tSummary('upToPrice', { max }),
          fromPrice: (min) => tSummary('fromPrice', { min }),
          priceRange: (min, max) => tSummary('priceRange', { min, max }),
          inLocation: (place) => tSummary('inLocation', { place }),
          bedrooms: (n) => tSummary('bedrooms', { count: n }),
        },
        (p) => {
          if (p.city) return p.city;
          if (p.provinceSlug) {
            return ITALIAN_PROVINCES.find((x) => x.slug === p.provinceSlug)?.name ?? p.provinceSlug;
          }
          if (p.regionSlug) {
            return REGION_NAMES[p.regionSlug as keyof typeof REGION_NAMES] ?? p.regionSlug;
          }
          return null;
        },
      );
      const criteria = buildSavedSearchCriteriaFromUrl(urlParams);
      await createSavedSearch(authedFetch, token, {
        name,
        criteria,
        frequency: 'off',
      });
      setMessage('success');
    } finally {
      setBusy(false);
    }
  }, [authedFetch, getAccessToken, tSummary, urlParams]);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    const raw = sessionStorage.getItem(PENDING_SAVE_SEARCH_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PENDING_SAVE_SEARCH_KEY);
    void runSave();
  }, [ready, isAuthenticated, runSave]);

  const onClick = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_SAVE_SEARCH_KEY, '1');
      const returnTo =
        typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/search';
      void signIn(returnTo);
      return;
    }
    void runSave();
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant="outline" disabled={!ready || busy} onClick={onClick}>
        {busy ? t('saving') : t('cta')}
      </Button>
      {message === 'success' ? (
        <p className="text-sm text-muted text-right max-w-xs">
          {t('success')}{' '}
          <Link href="/favorites" className="text-azure underline hover:no-underline">
            {t('successLink')}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
