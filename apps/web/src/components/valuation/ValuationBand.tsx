'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { ValuationBandResponseDto } from '@/lib/valuation-band';
import { centsToEuro } from '@/lib/valuation-band';
import { euro } from '@/lib/format';

function perSqm(cents: number, locale: string): string {
  const n = centsToEuro(cents);
  return `${new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)}/m²`;
}

function HomeMarker({ label }: { label: string }) {
  return (
    <span className="flex flex-col items-center">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="text-ink drop-shadow-sm"
        fill="currentColor"
      >
        <path d="M12 3 4 10v11h6v-7h4v7h6V10L12 3z" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

interface AnchorProps {
  align: 'start' | 'center' | 'end';
  title: string;
  totalCents: number;
  perM2Cents: number;
  tone: 'pine' | 'ink' | 'clay';
  locale: string;
}

function Anchor({ align, title, totalCents, perM2Cents, tone, locale }: AnchorProps) {
  const alignClass =
    align === 'start' ? 'items-start text-left' : align === 'end' ? 'items-end text-right' : 'items-center text-center';
  const color =
    tone === 'pine' ? 'text-pine' : tone === 'clay' ? 'text-clay' : 'text-ink';
  return (
    <div className={`flex flex-col gap-0.5 min-w-0 ${alignClass}`}>
      <span className={`text-xs font-medium ${color}`}>{title}</span>
      <span className="data text-sm text-ink">{euro(centsToEuro(totalCents), locale)}</span>
      <span className="data text-xs text-muted">{perSqm(perM2Cents, locale)}</span>
    </div>
  );
}

export function ValuationBand({ data }: { data: Extract<ValuationBandResponseDto, { status: 'ok' }> }) {
  const t = useTranslations('valuationBand');
  const locale = useLocale();
  const { anchors, asking, provenance } = data;

  const markerPct = asking?.positionPct ?? null;
  const outOfMarket = asking?.side === 'above' || asking?.side === 'below';

  const a11ySummary = t('a11ySummary', {
    zone: provenance.zoneLabel,
    selling: euro(centsToEuro(anchors.selling.totalCents), locale),
    fair: euro(centsToEuro(anchors.fairMarket.totalCents), locale),
    high: euro(centsToEuro(anchors.outOfMarket.totalCents), locale),
    asking: asking ? euro(centsToEuro(asking.totalCents), locale) : t('a11yNoAsking'),
    status: outOfMarket ? t('markerOutOfMarket') : t('markerInBand'),
  });

  const sourceLabel =
    data.provenance.source === 'omi' && data.provenance.attribution
      ? data.provenance.attribution
      : data.provenance.provisional
        ? t('sourceProvisional')
        : t('sourceOmi');

  return (
    <section className="rounded-xl border border-line bg-paper p-5" aria-labelledby="valuation-band-title">
      <h2 id="valuation-band-title" className="font-display text-lg font-semibold text-ink">
        {t('title')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('subtitle')}</p>

      <div className="mt-6 relative pt-10 pb-2">
        <div
          className="relative h-3 w-full rounded-full overflow-visible"
          role="img"
          aria-label={a11ySummary}
        >
          <div
            className="h-full w-full rounded-full"
            style={{
              background: 'linear-gradient(to right, var(--pine), var(--sand), var(--clay))',
            }}
          />
          {markerPct != null && asking ? (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${markerPct}%` }}
            >
              <HomeMarker
                label={t('markerLabel', {
                  price: euro(centsToEuro(asking.totalCents), locale),
                  status: outOfMarket ? t('markerOutOfMarket') : t('markerInBand'),
                })}
              />
              <span className="w-0.5 h-4 bg-ink" aria-hidden="true" />
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Anchor
            align="start"
            title={t('anchorSelling')}
            totalCents={anchors.selling.totalCents}
            perM2Cents={anchors.selling.perM2Cents}
            tone="pine"
            locale={locale}
          />
          <Anchor
            align="center"
            title={t('anchorFair')}
            totalCents={anchors.fairMarket.totalCents}
            perM2Cents={anchors.fairMarket.perM2Cents}
            tone="ink"
            locale={locale}
          />
          <Anchor
            align="end"
            title={t('anchorOutOfMarket')}
            totalCents={anchors.outOfMarket.totalCents}
            perM2Cents={anchors.outOfMarket.perM2Cents}
            tone="clay"
            locale={locale}
          />
        </div>
      </div>

      {outOfMarket && asking ? (
        <p className="mt-3 text-sm font-medium text-clay" role="status">
          {t('markerOutOfMarket')}
        </p>
      ) : null}

      <footer className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-muted">
        <p>
          <span className="font-medium text-ink">{t('sourceLabel')}: </span>
          {sourceLabel}
          {provenance.period ? ` · ${provenance.period}` : ''}
          {provenance.zoneLabel ? ` · ${provenance.zoneLabel}` : ''}
        </p>
        <p>{t('disclaimer')}</p>
        {provenance.source === 'comparable_listings' || provenance.provisional ? (
          <p className="text-ink/80">{t('provisionalNotice')}</p>
        ) : null}
      </footer>
      <p className="sr-only">{a11ySummary}</p>
    </section>
  );
}
