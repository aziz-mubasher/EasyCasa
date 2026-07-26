'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { CatalogItemRow, ServiceQuoteRow } from '@/lib/api';
import { requestServiceQuote } from '@/lib/api';
import {
  COMPARISON_SELLER_ITEM_CODES,
  DEFAULT_PROPERTY_VALUE_EUR,
  TRADITIONAL_AGENCY_RATE,
} from '@/lib/pricing-config';
import { formatEuroCents, grossCentsForCatalogItem } from '@/lib/pricing-display';

const MIN_VALUE_EUR = 50_000;
const MAX_VALUE_EUR = 2_000_000;
const STEP_EUR = 5_000;

type Props = {
  locale: string;
  catalogByCode: Record<string, CatalogItemRow>;
};

export function SavingsComparison({ locale, catalogByCode }: Props) {
  const t = useTranslations('pricing.comparison');
  const inputId = useId();
  const sliderId = `${inputId}-slider`;

  const [valueEur, setValueEur] = useState(DEFAULT_PROPERTY_VALUE_EUR);
  const [quote, setQuote] = useState<ServiceQuoteRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referenceValueCents = valueEur * 100;
  const traditionalCents = Math.round(referenceValueCents * TRADITIONAL_AGENCY_RATE);

  const comparisonLines = useMemo(
    () =>
      COMPARISON_SELLER_ITEM_CODES.map((code) => catalogByCode[code]).filter(
        (item): item is CatalogItemRow => Boolean(item),
      ),
    [catalogByCode],
  );

  const loadQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = await requestServiceQuote({
        items: [...COMPARISON_SELLER_ITEM_CODES],
        referenceValueCents,
      });
      setQuote(q);
    } catch (err) {
      setQuote(null);
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setLoading(false);
    }
  }, [referenceValueCents, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQuote();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [loadQuote]);

  const easyTotalCents = quote?.estimatedTotalGrossCents ?? null;
  const easyDueNowCents = quote?.dueNowGrossCents ?? null;
  const savingsCents =
    easyTotalCents != null ? Math.max(0, traditionalCents - easyTotalCents) : null;

  const mediationItem = catalogByCode.FULL_MEDIATION;
  const mediationRateLabel =
    mediationItem?.ratePercent != null
      ? `${(mediationItem.ratePercent * 100).toFixed(2)}%`
      : '—';

  function clampEuros(n: number): number {
    return Math.min(MAX_VALUE_EUR, Math.max(MIN_VALUE_EUR, n));
  }

  return (
    <section
      className="mt-12 rounded-2xl border border-azure/25 bg-gradient-to-br from-azure/[0.07] to-paper p-6 sm:p-8 shadow-sm"
      aria-labelledby={`${inputId}-heading`}
    >
      <h2 id={`${inputId}-heading`} className="font-display text-2xl font-semibold text-ink">
        {t('title')}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted leading-relaxed">{t('intro')}</p>

      <div className="mt-6">
        <label htmlFor={inputId} className="block text-sm font-medium text-ink">
          {t('propertyValueLabel')}
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            id={inputId}
            type="number"
            min={MIN_VALUE_EUR}
            max={MAX_VALUE_EUR}
            step={STEP_EUR}
            value={valueEur}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              if (!Number.isNaN(parsed)) setValueEur(clampEuros(parsed));
            }}
            className="data w-full max-w-xs rounded-lg border border-line bg-paper px-3 py-2.5 text-lg font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure"
            aria-describedby={`${inputId}-hint ${sliderId}-label`}
          />
          <input
            id={sliderId}
            type="range"
            min={MIN_VALUE_EUR}
            max={MAX_VALUE_EUR}
            step={STEP_EUR}
            value={valueEur}
            onChange={(e) => setValueEur(Number(e.target.value))}
            className="w-full flex-1 accent-azure"
            aria-labelledby={`${sliderId}-label`}
          />
        </div>
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-muted">
          {t('propertyValueHint', {
            min: formatEuroCents(MIN_VALUE_EUR * 100, locale),
            max: formatEuroCents(MAX_VALUE_EUR * 100, locale),
          })}
        </p>
        <span id={`${sliderId}-label`} className="sr-only">
          {t('propertyValueLabel')}
        </span>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-line bg-paper/80 p-5">
          <h3 className="font-display text-lg font-semibold text-ink">{t('traditionalTitle')}</h3>
          <p className="mt-1 text-xs text-muted">{t('traditionalNote', { rate: (TRADITIONAL_AGENCY_RATE * 100).toFixed(0) })}</p>
          <p className="mt-4 data text-3xl font-semibold text-ink" aria-live="polite">
            {formatEuroCents(traditionalCents, locale)}
          </p>
          <p className="mt-2 text-sm text-muted">{t('traditionalFootnote')}</p>
        </article>

        <article className="rounded-xl border border-azure/40 bg-paper p-5">
          <h3 className="font-display text-lg font-semibold text-ink">{t('easycasaTitle')}</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-ink">
            {comparisonLines.map((item) => {
              const label = locale === 'it' ? item.labelIt : item.labelEn;
              let detail = '';
              if (item.priceModel === 'fixed' && item.amountCents != null) {
                const gross = grossCentsForCatalogItem(item);
                detail = gross != null ? formatEuroCents(gross, locale) : formatEuroCents(item.amountCents, locale);
              } else if (item.priceModel === 'provvigione') {
                detail = t('mediationLine', { rate: mediationRateLabel });
              }
              return (
                <li key={item.code} className="flex justify-between gap-3">
                  <span>{label}</span>
                  <span className="data shrink-0 text-muted">{detail}</span>
                </li>
              );
            })}
          </ul>
          {loading && !quote ? (
            <p className="mt-4 text-sm text-muted">{t('calculating')}</p>
          ) : error ? (
            <p className="mt-4 text-sm text-clay" role="alert">
              {error}
            </p>
          ) : (
            <>
              <p className="mt-4 text-xs text-muted">{t('easycasaDueNow')}</p>
              <p className="data text-xl font-semibold text-ink">
                {easyDueNowCents != null ? formatEuroCents(easyDueNowCents, locale) : '—'}
              </p>
              <p className="mt-3 text-xs text-muted">{t('easycasaWithMediation')}</p>
              <p className="data text-3xl font-semibold text-azure" aria-live="polite">
                {easyTotalCents != null ? formatEuroCents(easyTotalCents, locale) : '—'}
              </p>
              <p className="mt-2 text-xs text-muted leading-relaxed">{t('mediationHonesty')}</p>
            </>
          )}
        </article>
      </div>

      {savingsCents != null && !loading && !error ? (
        <p className="mt-6 rounded-lg bg-pine/10 px-4 py-3 text-sm text-ink">
          <span className="font-medium">{t('savingsLabel')} </span>
          <span className="data text-lg font-semibold text-pine">
            {formatEuroCents(savingsCents, locale)}
          </span>
          <span className="block mt-1 text-xs text-muted">{t('savingsDisclaimer')}</span>
        </p>
      ) : null}
    </section>
  );
}
