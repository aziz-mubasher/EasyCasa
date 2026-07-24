import type { AreaValuationBandData } from './area-valuation.port';

export type MarkerSide = 'below' | 'in_band' | 'above';

export interface ValuationBandAnchors {
  selling: { totalCents: number; perM2Cents: number };
  fairMarket: { totalCents: number; perM2Cents: number };
  outOfMarket: { totalCents: number; perM2Cents: number };
}

export interface ValuationBandMarker {
  totalCents: number;
  perM2Cents: number;
  /** 0–100 position between zone min and max €/m² (clamped). */
  positionPct: number;
  side: MarkerSide;
  clamped: boolean;
}

export interface ValuationBandOk {
  status: 'ok';
  surfaceM2: number;
  anchors: ValuationBandAnchors;
  asking: ValuationBandMarker | null;
  provenance: {
    source: 'omi' | 'comparable_listings';
    period: string | null;
    zoneLabel: string;
    provisional: boolean;
    attribution: string | null;
    geoLevel: 'microzone' | 'comune';
  };
  comparableCount: number;
}

export type ValuationBandUnavailableReason =
  | 'feature_disabled'
  | 'missing_surface'
  | 'insufficient_data'
  | 'unsupported_listing';

export interface ValuationBandUnavailable {
  status: 'unavailable';
  reason: ValuationBandUnavailableReason;
}

export type ValuationBandResponse = ValuationBandOk | ValuationBandUnavailable;

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Map zone €/m² band + surface + optional asking price to UI-ready band payload. */
export function buildValuationBand(
  surfaceM2: number,
  zone: AreaValuationBandData,
  askingPriceEur: number | null | undefined,
): ValuationBandOk {
  if (!(surfaceM2 > 0)) {
    throw new Error('surfaceM2 must be positive');
  }

  const anchors: ValuationBandAnchors = {
    selling: {
      perM2Cents: zone.minPerM2Cents,
      totalCents: Math.round(zone.minPerM2Cents * surfaceM2),
    },
    fairMarket: {
      perM2Cents: zone.avgPerM2Cents,
      totalCents: Math.round(zone.avgPerM2Cents * surfaceM2),
    },
    outOfMarket: {
      perM2Cents: zone.maxPerM2Cents,
      totalCents: Math.round(zone.maxPerM2Cents * surfaceM2),
    },
  };

  let asking: ValuationBandMarker | null = null;
  if (askingPriceEur != null && askingPriceEur > 0) {
    const totalCents = Math.round(askingPriceEur * 100);
    const perM2Cents = Math.round(totalCents / surfaceM2);
    const span = zone.maxPerM2Cents - zone.minPerM2Cents;
    const rawPct =
      span > 0 ? ((perM2Cents - zone.minPerM2Cents) / span) * 100 : 50;
    const positionPct = clampPct(rawPct);
    let side: MarkerSide = 'in_band';
    if (perM2Cents < zone.minPerM2Cents) side = 'below';
    else if (perM2Cents > zone.maxPerM2Cents) side = 'above';
    asking = {
      totalCents,
      perM2Cents,
      positionPct,
      side,
      clamped: side !== 'in_band',
    };
  }

  return {
    status: 'ok',
    surfaceM2,
    anchors,
    asking,
    provenance: {
      source: zone.source,
      period: zone.period,
      zoneLabel: zone.zoneLabel,
      provisional: zone.provisional,
      attribution: zone.attribution,
      geoLevel: zone.geoLevel,
    },
    comparableCount: zone.comparableCount,
  };
}

export function unavailableBand(reason: ValuationBandUnavailableReason): ValuationBandUnavailable {
  return { status: 'unavailable', reason };
}
