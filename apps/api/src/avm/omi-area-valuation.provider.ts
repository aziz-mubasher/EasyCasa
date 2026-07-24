import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';

import { normalizeProvinceSlug } from '@easycasa/shared';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { omiQuotes } from '../db/schema';
import { OMI_ATTRIBUTION } from '../omi/import/import-valori';
import { normalizeOmiComune } from '../omi/normalize-comune';
import type {
  AreaValuationBandData,
  AreaValuationProvider,
  AreaValuationQuery,
} from './domain/area-valuation.port';
import type { Condition } from './domain/types';

interface QuoteRow {
  minPerM2Cents: number;
  maxPerM2Cents: number;
  period: string;
  omiZone: string;
  attribution: string;
  stato: string;
  codTip: number;
}

function omiMidpoint(min: number, max: number): number {
  return Math.round((min + max) / 2);
}

function preferStato(stato: string, condition: Condition | null | undefined, codTip: number): number {
  if (codTip === 5 && (stato === 'O' || stato === 'N' || stato === 'S')) return 0;
  if (!condition) return stato === 'NORMALE' ? 2 : stato === 'OTTIMO' || stato === 'BUONO' ? 1 : 0;
  const target =
    condition === 'new' || condition === 'renovated'
      ? 'OTTIMO'
      : condition === 'good'
        ? 'NORMALE'
        : 'SCADENTE';
  if (stato === target) return 3;
  if (stato === 'NORMALE') return 2;
  return 1;
}

@Injectable()
export class OmiAreaValuationProvider implements AreaValuationProvider {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async bandForArea(query: AreaValuationQuery): Promise<AreaValuationBandData | null> {
    const provincia = normalizeProvinceSlug(query.provincia.trim());
    const comune = normalizeOmiComune(query.comune);
    if (!provincia || !comune) return null;

    let linkZona: string | null = null;
    let geoLevel: 'microzone' | 'comune' = 'comune';

    if (query.lat != null && query.lng != null && Number.isFinite(query.lat) && Number.isFinite(query.lng)) {
      linkZona = await this.linkZonaFromPoint(query.lng, query.lat);
      if (linkZona) geoLevel = 'microzone';
    }

    const rows = linkZona
      ? await this.quotesForLink(linkZona, query.propertyType)
      : await this.quotesForComune(comune, provincia, query.propertyType);

    if (rows.length === 0) return null;

    const period = rows[0]!.period;
    const filtered = rows.filter((r) => r.period === period);
    const band = this.aggregateBand(filtered, query.condition ?? null);
    if (!band) return null;

    const zonePart =
      geoLevel === 'microzone' && band.omiZone
        ? `Zona OMI ${band.omiZone}`
        : `Comune di ${titleCase(comune)} (livello comunale)`;

    return {
      minPerM2Cents: band.min,
      avgPerM2Cents: omiMidpoint(band.min, band.max),
      maxPerM2Cents: band.max,
      source: 'omi',
      period,
      zoneLabel: `${zonePart}, ${provincia}`,
      attribution: band.attribution || OMI_ATTRIBUTION,
      geoLevel,
      provisional: false,
      comparableCount: 0,
    };
  }

  private async linkZonaFromPoint(lng: number, lat: number): Promise<string | null> {
    try {
      const result = await this.db.execute(sql`
        SELECT link_zona
          FROM omi_zone_polygons
         WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
         ORDER BY period DESC
         LIMIT 1
      `);
      const row = result.rows[0] as { link_zona: string } | undefined;
      return row?.link_zona ?? null;
    } catch {
      return null;
    }
  }

  private async quotesForLink(linkZona: string, propertyType: string): Promise<QuoteRow[]> {
    return this.db
      .select({
        minPerM2Cents: omiQuotes.minPerM2Cents,
        maxPerM2Cents: omiQuotes.maxPerM2Cents,
        period: omiQuotes.period,
        omiZone: omiQuotes.omiZone,
        attribution: omiQuotes.attribution,
        stato: omiQuotes.stato,
        codTip: omiQuotes.codTip,
      })
      .from(omiQuotes)
      .where(and(eq(omiQuotes.linkZona, linkZona), eq(omiQuotes.type, propertyType)))
      .orderBy(desc(omiQuotes.period))
      .limit(200);
  }

  private async quotesForComune(
    comune: string,
    provincia: string,
    propertyType: string,
  ): Promise<QuoteRow[]> {
    return this.db
      .select({
        minPerM2Cents: omiQuotes.minPerM2Cents,
        maxPerM2Cents: omiQuotes.maxPerM2Cents,
        period: omiQuotes.period,
        omiZone: omiQuotes.omiZone,
        attribution: omiQuotes.attribution,
        stato: omiQuotes.stato,
        codTip: omiQuotes.codTip,
      })
      .from(omiQuotes)
      .where(
        and(
          eq(omiQuotes.provincia, provincia),
          eq(omiQuotes.comune, comune),
          eq(omiQuotes.type, propertyType),
        ),
      )
      .orderBy(desc(omiQuotes.period))
      .limit(400);
  }

  private aggregateBand(
    rows: QuoteRow[],
    condition: Condition | null,
  ): { min: number; max: number; omiZone: string; attribution: string } | null {
    if (rows.length === 0) return null;
    const sorted = [...rows].sort(
      (a, b) => preferStato(b.stato, condition, b.codTip) - preferStato(a.stato, condition, a.codTip),
    );
    const bestStato = sorted[0]!.stato;
    const sameStato = sorted.filter((r) => r.stato === bestStato);
    const min = Math.min(...sameStato.map((r) => r.minPerM2Cents));
    const max = Math.max(...sameStato.map((r) => r.maxPerM2Cents));
    if (!(max >= min)) return null;
    return {
      min,
      max,
      omiZone: sameStato[0]?.omiZone ?? '',
      attribution: sameStato[0]?.attribution ?? OMI_ATTRIBUTION,
    };
  }
}

function titleCase(comune: string): string {
  return comune
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}
