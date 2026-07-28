'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Slot } from '@easycasa/api-client';

import { useAuth } from '@/auth/AuthProvider';
import { RequireSignInLink } from '@/components/AuthControls';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/routing';
import { useViewingsApi } from '@/lib/viewings-api';
import { PRODUCT_EVENTS, trackProduct } from '@/lib/product-analytics';
import {
  formatRomeDay,
  formatRomeTime,
  romeDayKey,
  VIEWING_DISPLAY_TZ,
} from '@/lib/viewing-time';

const DAY_MS = 86_400_000;
const HORIZON_DAYS = 30;

type Props = {
  listingId: string;
  listingSlug: string;
  listingTitle: string;
  areaLabel: string | null;
};

type DayGroup = { key: string; label: string; slots: Slot[] };

export function BookViewingPicker({ listingId, listingSlug, listingTitle, areaLabel }: Props) {
  const t = useTranslations('viewings');
  const locale = useLocale();
  const { ready, isAuthenticated } = useAuth();
  const api = useViewingsApi();

  const range = useMemo(() => {
    const from = Date.now();
    return { from, to: from + HORIZON_DAYS * DAY_MS };
  }, []);

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [status, setStatus] = useState<'idle' | 'booking' | 'ok' | 'err'>('idle');
  const [bookError, setBookError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    void api
      .slots(listingId, range.from, range.to)
      .then((rows) => {
        if (cancelled) return;
        setSlots(rows);
        if (rows.length === 0) {
          trackProduct(PRODUCT_EVENTS.VIEWING_PICKER_EMPTY, {
            listingId,
            slots_available: 0,
          });
        } else {
          trackProduct(PRODUCT_EVENTS.VIEWING_PICKER_VIEWED, {
            listingId,
            slots_available: rows.length,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([]);
          setLoadError(t('errorLoadSlots'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, listingId, range.from, range.to, t]);

  const byDay = useMemo((): DayGroup[] => {
    if (!slots?.length) return [];
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = romeDayKey(s.startMs);
      const arr = map.get(k) ?? [];
      arr.push(s);
      map.set(k, arr);
    }
    return [...map.entries()].map(([key, daySlots]) => ({
      key,
      label: formatRomeDay(daySlots[0]!.startMs, locale),
      slots: daySlots,
    }));
  }, [slots, locale]);

  async function onRequest() {
    if (!selected) return;
    if (!isAuthenticated) {
      setBookError(t('errorSignIn'));
      setStatus('err');
      return;
    }
    setStatus('booking');
    setBookError(null);
    try {
      await api.book(listingId, { startMs: selected.startMs });
      setStatus('ok');
    } catch {
      setStatus('err');
      setBookError(t('errorBook'));
    }
  }

  if (status === 'ok' && selected) {
    return (
      <div className="space-y-4" role="status">
        <p className="font-display text-xl font-semibold text-pine">{t('requestedTitle')}</p>
        <p className="text-sm text-muted">{t('requestedNote')}</p>
        <p className="font-[var(--ec-mono)] text-ink">
          {formatRomeDay(selected.startMs, locale)} · {formatRomeTime(selected.startMs, locale)}
        </p>
        <Link href="/viewings" className="inline-flex text-sm text-azure underline hover:no-underline">
          {t('goToMyViewings')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{t('bookTitle')}</h1>
        <p className="mt-2 text-muted text-sm max-w-xl">{listingTitle}</p>
        {areaLabel ? <p className="mt-1 text-sm text-muted">{areaLabel}</p> : null}
        <p className="mt-3 text-xs text-muted font-[var(--ec-mono)]">
          {t('timezoneNote', { zone: VIEWING_DISPLAY_TZ })}
        </p>
      </div>

      {slots === null ? (
        <p className="text-sm text-muted">{t('loading')}</p>
      ) : loadError ? (
        <p className="text-sm text-muted" role="alert">
          {loadError}
        </p>
      ) : byDay.length === 0 ? (
        <div className="space-y-3 rounded-xl2 border border-line bg-paper p-5">
          <p className="text-ink font-display font-medium">{t('noSlots')}</p>
          <p className="text-sm text-muted">{t('noSlotsHint')}</p>
          <Link
            href={`/listings/${listingSlug}#contact`}
            className="inline-flex text-sm text-azure underline hover:no-underline"
          >
            {t('enquiryCta')}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {byDay.map((day) => (
            <div key={day.key}>
              <h2 className="ec-label mb-3">{day.label}</h2>
              <div className="flex flex-wrap gap-2" role="list">
                {day.slots.map((s) => {
                  const active = selected?.startMs === s.startMs;
                  return (
                    <button
                      key={s.startMs}
                      type="button"
                      role="listitem"
                      aria-pressed={active}
                      onClick={() => setSelected(s)}
                      className={`rounded-lg border px-3.5 py-2.5 text-sm font-[var(--ec-mono)] transition ${
                        active
                          ? 'border-azure bg-azure/10 text-azure'
                          : 'border-line bg-paper text-ink hover:border-ink'
                      }`}
                    >
                      {formatRomeTime(s.startMs, locale)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {byDay.length > 0 ? (
        <div className="space-y-3 border-t border-line pt-5">
          {ready && !isAuthenticated ? (
            <div>
              <p className="text-sm text-muted mb-2">{t('signInPrompt')}</p>
              <RequireSignInLink />
            </div>
          ) : (
            <Button
              type="button"
              disabled={!selected || status === 'booking' || !isAuthenticated}
              onClick={() => void onRequest()}
            >
              {status === 'booking' ? t('requesting') : t('requestCta')}
            </Button>
          )}
          {bookError ? (
            <p className="text-sm text-muted" role="alert">
              {bookError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
