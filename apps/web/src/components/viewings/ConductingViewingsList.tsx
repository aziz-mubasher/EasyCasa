'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Viewing } from '@easycasa/api-client';

import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Link, usePathname } from '@/i18n/routing';
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

function formatBand(cents: number, locale: string): string {
  const euros = Math.round(cents / 100);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(euros);
  } catch {
    return `€${euros.toLocaleString('it-IT')}`;
  }
}

/** EC-1 badge on 05c — absence renders nothing (no negative marker). */
function Banks4AllViewingBadge({ viewing, locale }: { viewing: Viewing; locale: string }) {
  const t = useTranslations('viewings');
  const band = viewing.b4aBandMaxCents;
  const expires = viewing.b4aExpiresAt;
  if (band == null || !expires) return null;
  return (
    <div className="mt-2 rounded-lg border border-line bg-wash/40 px-3 py-2 space-y-1">
      <p className="text-xs font-semibold text-ink">{t('b4aTitle')}</p>
      <p className="text-xs font-[var(--ec-mono)] text-ink">
        {t('b4aRange', { band: formatBand(band, locale), expires })}
      </p>
      <p className="text-[11px] text-muted leading-snug">{t('b4aDisclaimer')}</p>
      <p className="text-[11px] text-muted leading-snug">{t('b4aGroup')}</p>
    </div>
  );
}

/** 05c conductor inbox — confirm/decline + optional EC-1 affordability badge. */
export function ConductingViewingsList() {
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
      const data = await api.listConducting();
      setRows(data);
    } catch {
      setRows([]);
      setError(t('errorLoadConducting'));
    }
  }, [api, t]);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    void load();
  }, [ready, isAuthenticated, load]);

  async function act(id: string, action: 'confirm' | 'cancel') {
    setBusyId(id);
    setError(null);
    try {
      await api.act(id, action);
      await load();
    } catch {
      setError(action === 'confirm' ? t('errorConfirm') : t('errorCancel'));
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
        <p className="text-sm text-muted">{t('signInPromptConducting')}</p>
        <Button type="button" onClick={() => void signIn(pathname || '/viewings/conducting')}>
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
          <p className="text-ink font-display font-medium">{t('emptyConducting')}</p>
          <Link href="/viewings" className="text-sm text-azure underline hover:no-underline">
            {t('backToMine')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((v) => {
            const title = v.listingTitle?.trim() || t('untitledListing');
            const place = v.address?.trim() || v.areaLabel?.trim() || null;
            const busy = busyId === v.id;
            return (
              <li
                key={v.id}
                className="rounded-xl2 border border-line bg-paper p-4 sm:p-5 space-y-2"
              >
                <p className="font-display font-medium text-ink">{title}</p>
                <p className="font-[var(--ec-mono)] text-sm text-ink">
                  {formatRomeDateTime(v.startMs, locale)}
                </p>
                <p className="text-xs uppercase tracking-wide text-azure font-[var(--ec-mono)]">
                  {t(statusKey(v.status))}
                </p>
                {place ? <p className="text-sm text-muted">{place}</p> : null}
                <Banks4AllViewingBadge viewing={v} locale={locale} />
                {v.status === 'REQUESTED' ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() => void act(v.id, 'confirm')}
                    >
                      {busy ? t('confirming') : t('confirmCta')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void act(v.id, 'cancel')}
                    >
                      {t('declineCta')}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
