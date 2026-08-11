'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SellerListingAnalytics } from '@easycasa/shared';

import { useAuth } from '@/auth/AuthProvider';
import { createAuthedFetch } from '@/auth/authedFetch';

import './seller-analytics.css';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://easycasaita.com/api';

type Props = {
  listingId: string;
  /** Default query window. */
  window?: '7d' | '30d' | '90d';
};

function formatRate(rate: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(rate);
}

function formatPct(n: number, locale: string): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(n)}%`;
}

/** Simple CSS sparkline from daily view counts. */
function ViewSparkline({ series }: { series: Array<{ day: string; views: number }> }) {
  const max = Math.max(1, ...series.map((s) => s.views));
  return (
    <div className="sa-spark" role="img" aria-hidden="true">
      {series.map((s) => (
        <span
          key={s.day}
          className="sa-spark__bar"
          style={{ height: `${Math.max(8, (s.views / max) * 100)}%` }}
          title={`${s.day}: ${s.views}`}
        />
      ))}
    </div>
  );
}

export function SellerAnalyticsPanel({ listingId, window: win = '30d' }: Props) {
  const t = useTranslations('sellerAnalytics');
  const { ready, isAuthenticated, getAccessToken, signIn } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const [data, setData] = useState<SellerListingAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowKey, setWindowKey] = useState<'7d' | '30d' | '90d'>(win);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await authedFetch(
          `${API}/seller/listings/${encodeURIComponent(listingId)}/analytics?window=${windowKey}`,
          { headers: { Accept: 'application/json' } },
        );
        if (cancelled) return;
        if (res.status === 404) {
          setError('unavailable');
          setData(null);
          return;
        }
        if (!res.ok) {
          setError('load');
          setData(null);
          return;
        }
        const json = (await res.json()) as SellerListingAnalytics;
        setData(json);
      } catch {
        if (!cancelled) setError('load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, isAuthenticated, authedFetch, listingId, windowKey]);

  if (ready && !isAuthenticated) {
    return (
      <div className="sa-panel">
        <p className="sa-muted">{t('signIn')}</p>
        <button
          type="button"
          className="sa-btn"
          onClick={() =>
            void signIn(typeof window !== 'undefined' ? window.location.pathname : '/')
          }
        >
          {t('signInCta')}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="sa-panel" aria-busy="true">
        <p className="sa-muted">{t('loading')}</p>
      </div>
    );
  }

  if (error === 'unavailable') {
    return (
      <div className="sa-panel">
        <p className="sa-muted">{t('unavailable')}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="sa-panel">
        <p className="sa-muted">{t('error')}</p>
      </div>
    );
  }

  const locale = typeof navigator !== 'undefined' ? navigator.language : 'it-IT';

  return (
    <section className="sa-panel" data-testid="seller-analytics-panel">
      <header className="sa-header">
        <div>
          <h2 className="sa-title">{t('title')}</h2>
          <p className="sa-lead">{t('lead')}</p>
        </div>
        <label className="sa-window">
          <span className="sa-window__label">{t('windowLabel')}</span>
          <select
            value={windowKey}
            onChange={(e) => setWindowKey(e.target.value as '7d' | '30d' | '90d')}
            className="sa-window__select"
          >
            <option value="7d">{t('window.7d')}</option>
            <option value="30d">{t('window.30d')}</option>
            <option value="90d">{t('window.90d')}</option>
          </select>
        </label>
      </header>

      <div className="sa-kpis">
        <article className="sa-kpi">
          <p className="sa-kpi__label">{t('views')}</p>
          <p className="sa-kpi__value">{data.views}</p>
        </article>
        <article className="sa-kpi">
          <p className="sa-kpi__label">{t('saves')}</p>
          <p className="sa-kpi__value">{data.saves}</p>
        </article>
        <article className="sa-kpi">
          <p className="sa-kpi__label">{t('enquiries')}</p>
          <p className="sa-kpi__value">{data.enquiries}</p>
        </article>
        <article className="sa-kpi">
          <p className="sa-kpi__label">{t('enquiryRate')}</p>
          <p className="sa-kpi__value">{formatRate(data.enquiryRate, locale)}</p>
        </article>
        <article className="sa-kpi">
          <p className="sa-kpi__label">{t('daysOnMarket')}</p>
          <p className="sa-kpi__value">{data.daysOnMarket}</p>
        </article>
      </div>

      {data.series && data.series.length > 0 ? (
        <div className="sa-series">
          <p className="sa-kpi__label">{t('viewsSeries')}</p>
          <ViewSparkline series={data.series} />
        </div>
      ) : null}

      {data.priceVsOmiBandPct != null ? (
        <p className="sa-omi" data-testid="seller-analytics-omi">
          {t('priceVsOmi', { pct: formatPct(data.priceVsOmiBandPct, locale) })}
        </p>
      ) : (
        <p className="sa-muted">{t('priceVsOmiAbsent')}</p>
      )}
    </section>
  );
}
