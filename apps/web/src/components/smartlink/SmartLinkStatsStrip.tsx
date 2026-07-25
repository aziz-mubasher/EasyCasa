'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

import { useAuth } from '@/auth/AuthProvider';
import { createAuthedFetch } from '@/auth/authedFetch';
import { listMyShareLinks } from '@/lib/smartlink';

type Props = {
  token: string;
  listingSlug: string | null;
  viewCount: number;
  uniqueViewCount: number;
};

export function SmartLinkStatsStrip({ token, listingSlug, viewCount, uniqueViewCount }: Props) {
  const t = useTranslations('smartlink.stats');
  const { isAuthenticated, getAccessToken, signIn } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsOwner(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listMyShareLinks(authedFetch);
        if (!cancelled) {
          setIsOwner(rows.some((r) => r.token === token && !r.revokedAt));
        }
      } catch {
        if (!cancelled) setIsOwner(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, isAuthenticated, token]);

  const statsHref =
    isOwner && listingSlug ? (`/listings/${listingSlug}#listing-smartlink` as const) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3 px-5 py-3 text-sm text-muted">
      <p className="data text-ink">
        <span aria-label={t('viewsA11y', { count: viewCount })}>
          {viewCount} <span aria-hidden>♥</span>
        </span>
        {' · '}
        <span aria-label={t('uniqueA11y', { count: uniqueViewCount })}>
          {uniqueViewCount} <span aria-hidden>💬</span>
        </span>
      </p>
      {statsHref ? (
        <Link href={statsHref} className="text-azure hover:underline">
          {t('seeFull')}
        </Link>
      ) : (
        <button
          type="button"
          className="text-azure hover:underline"
          onClick={() => void signIn(typeof window !== 'undefined' ? window.location.pathname : '/')}
        >
          {t('seeFull')}
        </button>
      )}
    </div>
  );
}
