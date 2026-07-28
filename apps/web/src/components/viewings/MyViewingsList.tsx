'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Viewing } from '@easycasa/api-client';

import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Link, usePathname } from '@/i18n/routing';
import { viewingIcsDataUrl } from '@/lib/viewing-ics';
import { formatRomeDateTime, VIEWING_DISPLAY_TZ } from '@/lib/viewing-time';
import { useViewingsApi } from '@/lib/viewings-api';

function statusKey(status: Viewing['status']): string {
  switch (status) {
    case 'REQUESTED':
      return 'statusRequested';
    case 'CONFIRMED':
      return 'statusConfirmed';
    case 'COMPLETED':
      return 'statusCompleted';
    case 'CANCELLED':
      return 'statusCancelled';
    case 'NO_SHOW':
      return 'statusNoShow';
    default:
      return 'statusRequested';
  }
}

function locationLine(v: Viewing): string | null {
  if (v.status === 'CONFIRMED' || v.status === 'COMPLETED') {
    return v.address?.trim() || v.areaLabel?.trim() || null;
  }
  if (v.status === 'REQUESTED') {
    return v.areaLabel?.trim() || null;
  }
  return v.areaLabel?.trim() || v.address?.trim() || null;
}

export function MyViewingsList() {
  const t = useTranslations('viewings');
  const locale = useLocale();
  const pathname = usePathname();
  const { ready, isAuthenticated, signIn } = useAuth();
  const api = useViewingsApi();

  const [rows, setRows] = useState<Viewing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.listMine();
      setRows(data);
    } catch {
      setRows([]);
      setError(t('errorLoadMine'));
    }
  }, [api, t]);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    void load();
  }, [ready, isAuthenticated, load]);

  async function onCancel(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.act(id, 'cancel');
      await load();
    } catch {
      setError(t('errorCancel'));
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) {
    return <p className="mt-8 text-sm text-muted">{t('loading')}</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="mt-8 space-y-3">
        <p className="text-sm text-muted">{t('signInPromptMine')}</p>
        <Button type="button" onClick={() => void signIn(pathname || '/viewings')}>
          {t('signInCta')}
        </Button>
      </div>
    );
  }

  if (rows === null) {
    return <p className="mt-8 text-sm text-muted">{t('loading')}</p>;
  }

  return (
    <div className="mt-8 space-y-4">
      <p className="text-xs text-muted font-[var(--ec-mono)]">
        {t('timezoneNote', { zone: VIEWING_DISPLAY_TZ })}
      </p>
      {error ? (
        <p className="text-sm text-muted" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <div className="rounded-xl2 border border-line bg-paper p-5 space-y-2">
          <p className="text-ink font-display font-medium">{t('emptyMine')}</p>
          <Link href="/search" className="text-sm text-azure underline hover:no-underline">
            {t('emptyMineCta')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((v) => {
            const place = locationLine(v);
            const title = v.listingTitle?.trim() || t('untitledListing');
            const icsHref =
              v.status === 'CONFIRMED'
                ? viewingIcsDataUrl({
                    uid: `${v.id}@easycasa`,
                    title,
                    startMs: v.startMs,
                    endMs: v.endMs,
                    address: v.address,
                    description: place ?? undefined,
                  })
                : null;

            return (
              <li
                key={v.id}
                className="rounded-xl2 border border-line bg-paper p-4 sm:p-5 space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-display font-medium text-ink">{title}</p>
                    <p className="font-[var(--ec-mono)] text-sm text-ink">
                      {formatRomeDateTime(v.startMs, locale)}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-azure font-[var(--ec-mono)]">
                      {t(statusKey(v.status))}
                    </p>
                    {place ? <p className="text-sm text-muted">{place}</p> : null}
                    {v.status === 'REQUESTED' && !place ? (
                      <p className="text-sm text-muted">{t('areaPending')}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {v.status === 'REQUESTED' ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyId === v.id}
                        onClick={() => void onCancel(v.id)}
                      >
                        {busyId === v.id ? t('cancelling') : t('cancelCta')}
                      </Button>
                    ) : null}
                    {icsHref ? (
                      <a
                        href={icsHref}
                        download={`easycasa-visita-${v.id.slice(0, 8)}.ics`}
                        className="inline-flex items-center justify-center rounded-full border border-line px-5 py-2.5 text-sm font-medium font-[var(--font-display)] text-ink hover:border-ink"
                      >
                        {t('addToCalendar')}
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
