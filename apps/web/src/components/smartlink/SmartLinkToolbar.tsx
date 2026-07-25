'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

import { useAuth } from '@/auth/AuthProvider';
import { createAuthedFetch } from '@/auth/authedFetch';
import { listMyShareLinks } from '@/lib/smartlink';

type Props = {
  publicUrl: string;
  token: string;
  listingSlug: string | null;
};

export function SmartLinkToolbar({ publicUrl, token, listingSlug }: Props) {
  const t = useTranslations('smartlink.toolbar');
  const { isAuthenticated, getAccessToken } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const [isOwner, setIsOwner] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [publicUrl]);

  const shareLink = useCallback(async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ url: publicUrl, title: document.title });
        return;
      } catch {
        /* cancelled */
      }
    }
    await copyLink();
  }, [copyLink, publicUrl]);

  const trackingHref =
    isOwner && listingSlug ? (`/listings/${listingSlug}#listing-smartlink` as const) : null;

  return (
    <div className="bg-ink text-paper border-b border-ink/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2 px-5 py-2.5">
        {trackingHref ? (
          <Link
            href={trackingHref}
            className="rounded-md border border-paper/30 px-3 py-1.5 text-sm hover:bg-paper/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
          >
            {t('tracking')}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => void shareLink()}
          className="rounded-md bg-azure px-3 py-1.5 text-sm font-medium text-paper hover:bg-azure/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure"
        >
          {copied ? t('copied') : t('share')}
        </button>
      </div>
    </div>
  );
}
