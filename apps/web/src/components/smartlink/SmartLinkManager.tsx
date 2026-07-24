'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/auth/AuthProvider';
import { createAuthedFetch } from '@/auth/authedFetch';
import {
  createShareLink,
  listMyShareLinks,
  revokeShareLink,
  smartLinkPublicUrl,
  type ShareLinkOwnerDto,
} from '@/lib/smartlink';

export function SmartLinkManager({ listingId }: { listingId: string }) {
  const t = useTranslations('add.smartlink');
  const locale = useLocale();
  const { getAccessToken } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);

  const [includeBand, setIncludeBand] = useState(true);
  const [links, setLinks] = useState<ShareLinkOwnerDto[]>([]);
  const [active, setActive] = useState<ShareLinkOwnerDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    const rows = await listMyShareLinks(authedFetch);
    setLinks(rows.filter((r) => r.listingId === listingId && !r.revokedAt));
  };

  const onCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await createShareLink(authedFetch, listingId, includeBand);
      setActive(row);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const onRevoke = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await revokeShareLink(authedFetch, id);
      if (active?.id === id) setActive(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const publicUrl = active ? smartLinkPublicUrl(active.token, locale) : null;

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    if (!publicUrl) return;
    const text = encodeURIComponent(`${t('shareMessage')}\n${publicUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mt-8 rounded-xl border border-azure/30 bg-azure/5 p-5 space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('body')}</p>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          className="accent-[var(--azure)]"
          checked={includeBand}
          onChange={(e) => setIncludeBand(e.target.checked)}
        />
        {t('includeBand')}
      </label>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void onCreate()} disabled={loading}>
          {loading ? t('creating') : t('create')}
        </Button>
        <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
          {t('refresh')}
        </Button>
      </div>

      {error ? <p className="text-sm text-clay">{error}</p> : null}

      {active && publicUrl ? (
        <div className="rounded-lg border border-line bg-paper p-4 space-y-3">
          <p className="text-sm break-all">
            <span className="text-muted">{t('linkLabel')}: </span>
            <a className="text-azure hover:underline" href={publicUrl}>
              {publicUrl}
            </a>
          </p>
          <p className="data text-sm text-ink">
            {t('stats', { views: active.viewCount, unique: active.uniqueViewCount })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void copyLink()}>
              {copied ? t('copied') : t('copy')}
            </Button>
            <Button variant="outline" onClick={shareWhatsApp}>
              WhatsApp
            </Button>
            <Button variant="outline" onClick={() => void onRevoke(active.id)} disabled={loading}>
              {t('revoke')}
            </Button>
          </div>
        </div>
      ) : null}

      {links.length > 0 ? (
        <ul className="text-sm space-y-2">
          {links.map((link) => (
            <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
              <span className="data text-xs text-muted">
                {t('stats', { views: link.viewCount, unique: link.uniqueViewCount })}
              </span>
              <button
                type="button"
                className="text-azure text-sm hover:underline"
                onClick={() => setActive(link)}
              >
                {t('useLink')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
