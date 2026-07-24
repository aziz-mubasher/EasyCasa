'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { smartLinkUrl, type ShareLinkSummary } from '@/lib/share-link';

export function SmartLinkManagePanel({ listingId }: { listingId: string }) {
  const t = useTranslations('smartLink');
  const locale = useLocale();
  const { isAuthenticated, ready, getAccessToken } = useAuth();
  const [links, setLinks] = useState<ShareLinkSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(
        apiUrl(`/me/share-links?listingId=${encodeURIComponent(listingId)}`),
      );
      if (!res.ok) throw new Error(await res.text());
      setLinks((await res.json()) as ShareLinkSummary[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  }, [authedFetch, isAuthenticated, listingId, t]);

  useEffect(() => {
    if (ready && isAuthenticated) void refresh();
  }, [ready, isAuthenticated, refresh]);

  const createLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(apiUrl(`/listings/${listingId}/share-links`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeValuationBand: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(apiUrl(`/share-links/${id}/revoke`), { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const primary = links[0];
  const publicUrl = primary ? smartLinkUrl(locale, primary.token) : null;

  const copy = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const waShare = () => {
    if (!publicUrl) return;
    const text = encodeURIComponent(`${t('shareMessage')}\n${publicUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  if (!ready) return null;
  if (!isAuthenticated) return null;

  return (
    <section
      className="mt-8 rounded-xl border border-line bg-paper p-5"
      aria-labelledby="smartlink-manage-title"
    >
      <h2 id="smartlink-manage-title" className="font-display text-lg font-semibold text-ink">
        {t('manageTitle')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('manageHint')}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={loading} onClick={() => void createLink()}>
          {primary ? t('createAnother') : t('create')}
        </Button>
        {publicUrl ? (
          <>
            <Button variant="ghost" disabled={loading} onClick={() => void copy()}>
              {copied ? t('copied') : t('copy')}
            </Button>
            <Button variant="ghost" disabled={loading} onClick={waShare}>
              {t('whatsapp')}
            </Button>
          </>
        ) : null}
      </div>

      {primary ? (
        <dl className="mt-4 grid gap-2 text-sm data">
          <div>
            <dt className="text-muted">{t('statsLabel')}</dt>
            <dd>
              {t('statsValue', {
                views: primary.viewCount,
                unique: primary.uniqueViewCount,
              })}
            </dd>
          </div>
          {publicUrl ? (
            <div className="sm:col-span-2 break-all">
              <dt className="text-muted">{t('linkLabel')}</dt>
              <dd>
                <a href={publicUrl} className="text-azure underline" target="_blank" rel="noreferrer">
                  {publicUrl}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {links.length > 1 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {links.slice(1).map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-3 border-t border-line pt-2">
              <span className="text-muted data">
                {t('statsValue', { views: link.viewCount, unique: link.uniqueViewCount })}
              </span>
              <Button variant="ghost" disabled={loading} onClick={() => void revoke(link.id)}>
                {t('revoke')}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
