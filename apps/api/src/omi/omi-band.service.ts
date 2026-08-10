import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { omiQuotes } from '../db/schema';
import { mapPropertyTypeToCodTip } from './map-cod-tip';

export type OmiBand = {
  minEurSqm: number;
  maxEurSqm: number;
  medianEurSqm: number;
  semester: string;
  zoneId: string;
};

export type PricePosition = {
  askingEurSqm: number;
  midpointEurSqm: number;
  deviationPct: number;
  kind: 'in_band' | 'above' | 'below';
};

/** Pure band positioning math (T09) — unit-tested. */
export function positionAskingOnBand(
  askingPriceEur: number,
  sizeSqm: number,
  band: Pick<OmiBand, 'minEurSqm' | 'maxEurSqm' | 'medianEurSqm'>,
): PricePosition | null {
  if (!(askingPriceEur > 0) || !(sizeSqm > 0)) return null;
  const askingEurSqm = askingPriceEur / sizeSqm;
  const midpoint =
    band.medianEurSqm > 0
      ? band.medianEurSqm
      : (band.minEurSqm + band.maxEurSqm) / 2;
  if (!(midpoint > 0)) return null;
  const deviationPct = ((askingEurSqm - midpoint) / midpoint) * 100;
  let kind: PricePosition['kind'] = 'in_band';
  if (deviationPct > 20) kind = 'above';
  else if (deviationPct < -20) kind = 'below';
  return {
    askingEurSqm,
    midpointEurSqm: midpoint,
    deviationPct,
    kind,
  };
}

@Injectable()
export class OmiBandService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async bandForZone(input: {
    zoneId: string;
    propertyType: string;
    condition: string | null;
  }): Promise<OmiBand | null> {
    const codTip = mapPropertyTypeToCodTip(input.propertyType);
    const rows = await this.db
      .select({
        minPerM2Cents: omiQuotes.minPerM2Cents,
        maxPerM2Cents: omiQuotes.maxPerM2Cents,
        period: omiQuotes.period,
        linkZona: omiQuotes.linkZona,
      })
      .from(omiQuotes)
      .where(and(eq(omiQuotes.linkZona, input.zoneId), eq(omiQuotes.codTip, codTip)))
      .orderBy(desc(omiQuotes.period))
      .limit(20);

    if (rows.length === 0) return null;
    const period = rows[0]!.period;
    const same = rows.filter((r) => r.period === period);
    const mins = same.map((r) => r.minPerM2Cents);
    const maxs = same.map((r) => r.maxPerM2Cents);
    const minCents = Math.min(...mins);
    const maxCents = Math.max(...maxs);
    const minEurSqm = minCents / 100;
    const maxEurSqm = maxCents / 100;
    return {
      minEurSqm,
      maxEurSqm,
      medianEurSqm: (minEurSqm + maxEurSqm) / 2,
      semester: period,
      zoneId: input.zoneId,
    };
  }
}
