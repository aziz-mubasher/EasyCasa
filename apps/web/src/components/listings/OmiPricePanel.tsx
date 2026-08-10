'use client';

/**
 * EC-S-T09 — OMI pricing panel (observation-only copy; matrix rows 2–3).
 * Forbidden recommendation tokens are CI-grepped in this module directory.
 */

export type OmiBandView = {
  minEurSqm: number;
  maxEurSqm: number;
  medianEurSqm: number;
  semester: string;
  zoneId: string;
};

export type OmiPricePanelProps = {
  band: OmiBandView | null;
  askingPriceEur: number;
  sizeSqm: number;
  /** Locale for number formatting (it/en/es). */
  locale?: string;
  copy: {
    inBand: string; // "Il tuo prezzo: {price}/m² — fascia OMI {zona}: {min}–{max}/m²"
    above: string; // "Il tuo prezzo è oltre il {pct}% sopra la fascia OMI di zona"
    below: string;
    footer: string; // "Dati OMI … {semestre}."
  };
};

function formatEur(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function positionOnBand(
  askingPriceEur: number,
  sizeSqm: number,
  band: OmiBandView,
): { askingEurSqm: number; deviationPct: number; kind: 'in_band' | 'above' | 'below' } | null {
  if (!(askingPriceEur > 0) || !(sizeSqm > 0)) return null;
  const askingEurSqm = askingPriceEur / sizeSqm;
  const mid = band.medianEurSqm || (band.minEurSqm + band.maxEurSqm) / 2;
  if (!(mid > 0)) return null;
  const deviationPct = ((askingEurSqm - mid) / mid) * 100;
  let kind: 'in_band' | 'above' | 'below' = 'in_band';
  if (deviationPct > 20) kind = 'above';
  else if (deviationPct < -20) kind = 'below';
  return { askingEurSqm, deviationPct, kind };
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

export function OmiPricePanel({
  band,
  askingPriceEur,
  sizeSqm,
  locale = 'it-IT',
  copy,
}: OmiPricePanelProps) {
  if (!band) return null;
  const pos = positionOnBand(askingPriceEur, sizeSqm, band);
  if (!pos) return null;

  const price = formatEur(pos.askingEurSqm, locale);
  const min = formatEur(band.minEurSqm, locale);
  const max = formatEur(band.maxEurSqm, locale);
  const pct = String(Math.round(Math.abs(pos.deviationPct)));

  let body = fill(copy.inBand, {
    price,
    zona: band.zoneId,
    min,
    max,
  });
  if (pos.kind === 'above') body = fill(copy.above, { pct });
  if (pos.kind === 'below') body = fill(copy.below, { pct });

  return (
    <aside className="omi-price-panel" data-testid="omi-price-panel">
      <p
        className="omi-price-panel__body"
        style={{
          fontFamily: 'var(--font-mono, "IBM Plex Mono", ui-monospace, monospace)',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--ec-ochre, #C08A1E)',
        }}
      >
        {body}
      </p>
      <p className="omi-price-panel__footer" style={{ fontSize: '0.85rem' }}>
        {fill(copy.footer, { semestre: band.semester })}
      </p>
    </aside>
  );
}
