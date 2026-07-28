'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ValuationBandResponseDto } from '@/lib/valuation-band';
import { centsToEuro } from '@/lib/valuation-band';

function fmtPerM2(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(centsToEuro(cents));
}

/** Comp-03 OMI block — ochre estimates, honest geoLevel labelling. */
export function ListingOmiBand({
  data,
}: {
  data: Extract<ValuationBandResponseDto, { status: 'ok' }>;
}) {
  const t = useTranslations('listingDetail.omi');
  const locale = useLocale();
  const { anchors, asking, provenance } = data;

  const low = anchors.selling.perM2Cents;
  const high = anchors.outOfMarket.perM2Cents;
  const ask = asking?.perM2Cents ?? null;

  // Fill spans the “fair” band between selling and out-of-market anchors.
  const span = Math.max(high - low, 1);
  const fillLeft = 0;
  const fillRight = 0;
  const tickPct =
    ask != null ? Math.min(100, Math.max(0, ((ask - low) / span) * 100)) : null;

  const zoneLabel =
    provenance.geoLevel === 'comune'
      ? t('zoneComune', { zone: provenance.zoneLabel })
      : t('zoneMicro', { zone: provenance.zoneLabel });

  const note =
    asking?.side === 'below'
      ? t('noteBelow')
      : asking?.side === 'above'
        ? t('noteAbove')
        : t('noteInBand');

  const attribution =
    provenance.attribution ??
    (provenance.source === 'omi' ? t('sourceOmi') : t('sourceComparable'));

  return (
    <section className="ld-omi" aria-labelledby="ld-omi-heading">
      <header id="ld-omi-heading">{t('heading')}</header>
      <div className="in">
        <p className="band">
          {t('bandRange', {
            low: fmtPerM2(low, locale),
            high: fmtPerM2(high, locale),
          })}
        </p>
        <p className="zone">
          {zoneLabel}
          {provenance.period ? ` · ${provenance.period}` : ''}
        </p>
        <div className="rail" aria-hidden>
          <span className="fill" style={{ left: `${fillLeft}%`, right: `${fillRight}%` }} />
          {tickPct != null ? <span className="tick" style={{ left: `${tickPct}%` }} /> : null}
        </div>
        <div className="legend">
          <span>{fmtPerM2(low, locale)}</span>
          {ask != null ? (
            <span>{t('thisListing', { price: fmtPerM2(ask, locale) })}</span>
          ) : (
            <span />
          )}
          <span>{fmtPerM2(high, locale)}</span>
        </div>
        <p className="note">{note}</p>
        <p className="src">{attribution}</p>
      </div>
    </section>
  );
}
