'use client';

import { useTranslations } from 'next-intl';
import type { ValuationBandResponseDto } from '@/lib/valuation-band';
import { ValuationBand } from './ValuationBand';

export function ValuationBandUnavailable({ reason }: { reason: string }) {
  const t = useTranslations('valuationBand');
  if (reason === 'feature_disabled') return null;
  const message =
    reason === 'missing_surface'
      ? t('unavailableMissingSurface')
      : t('unavailableArea');
  return (
    <section
      className="rounded-xl border border-line bg-sand/40 p-5"
      aria-labelledby="valuation-band-unavailable"
    >
      <h2 id="valuation-band-unavailable" className="font-display text-lg font-semibold text-ink">
        {t('title')}
      </h2>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <p className="mt-3 text-xs text-muted">{t('disclaimer')}</p>
    </section>
  );
}

export function ValuationBandPanel({ data }: { data: ValuationBandResponseDto }) {
  if (data.status === 'unavailable') {
    return <ValuationBandUnavailable reason={data.reason} />;
  }
  return <ValuationBand data={data} />;
}
