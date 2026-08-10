import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRODUCT_EVENTS, normalizeProvinceSlug } from '@easycasa/shared';
import { and, desc, eq, sql } from 'drizzle-orm';

import { ProductAnalyticsService } from '../analytics/product-analytics.service';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { omiQuotes } from '../db/schema';
import { OMI_ATTRIBUTION } from '../omi/import/import-valori';
import { normalizeOmiComune } from '../omi/normalize-comune';
import { OmiZoneService } from '../omi/omi-zone.service';
import {
  OMI_CHECK_ATTRIBUTION,
  buildOmiCheck,
  type AsteOmiCheck,
  type OmiBandInput,
  type OmiCheckMethod,
} from './aste-omi-check';
import type { AsteExtractionV1 } from './extraction-schema';
import { mapAsteToOmiCodTip } from './map-aste-to-omi-cod-tip';

type QuoteRow = {
  minPerM2Cents: number;
  maxPerM2Cents: number;
  period: string;
  linkZona: string | null;
  attribution: string;
  stato: string;
  codTip: number;
};

/** Accent-fold + existing OMI comune normalize (documented in omi_check.normalization.rules). */
export function normalizeAsteOmiComune(raw: string): string {
  const folded = raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  return normalizeOmiComune(folded);
}

@Injectable()
export class AsteOmiCheckService {
  private readonly log = new Logger(AsteOmiCheckService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly zones: OmiZoneService,
    private readonly analytics: ProductAnalyticsService,
  ) {}

  async compute(extraction: AsteExtractionV1): Promise<AsteOmiCheck> {
    const tip = mapAsteToOmiCodTip({
      tipologia: extraction.immobile.tipologia,
      categoria_catastale: extraction.immobile.categoria_catastale,
    });

    const comuneRaw = extraction.immobile.comune ?? '';
    const provinciaRaw = extraction.immobile.provincia ?? '';
    const comune = comuneRaw ? normalizeAsteOmiComune(comuneRaw) : null;
    const provincia = provinciaRaw ? normalizeProvinceSlug(provinciaRaw) : null;

    const superficie = extraction.economics.superficie_commerciale_mq?.value ?? null;
    const prezzoBase = extraction.economics.prezzo_base?.value ?? null;
    const valoreStima = extraction.economics.valore_stima?.value ?? null;

    let method: OmiCheckMethod | null = null;
    let confidence: AsteOmiCheck['confidence'] = null;
    let band: OmiBandInput | null = null;
    const extraWarnings: string[] = [];

    if (comune && provincia) {
      const addressParts = [
        extraction.immobile.indirizzo,
        comuneRaw,
        provinciaRaw,
        'Italia',
      ].filter((p): p is string => Boolean(p && String(p).trim()));
      const address = addressParts.join(', ');

      if (extraction.immobile.indirizzo?.trim()) {
        try {
          const hit = await this.zones.resolveAddress(address);
          if (hit?.zoneId) {
            const zoneBand = await this.bandForLink(hit.zoneId, tip.propertyType, tip.codTip);
            if (zoneBand) {
              method = 'zone';
              confidence = hit.confidence === 'polygon' ? 'high' : 'medium';
              band = zoneBand;
            } else {
              extraWarnings.push('zone_resolved_but_no_quotes');
            }
          }
        } catch (err) {
          this.log.warn(
            JSON.stringify({
              event: 'aste.omi_zone_resolve_failed',
              err: err instanceof Error ? err.message : 'unknown',
            }),
          );
          extraWarnings.push('zone_geocode_failed');
        }
      } else {
        extraWarnings.push('indirizzo_missing_comune_ceiling');
      }

      if (!band) {
        const comuneBand = await this.bandForComune(comune, provincia, tip.propertyType, tip.codTip);
        if (comuneBand) {
          method = 'comune';
          confidence = confidence ?? 'medium';
          band = comuneBand;
        } else {
          // Retry without accent fold already applied — try original normalizeOmiComune only
          const alt = normalizeOmiComune(comuneRaw);
          if (alt !== comune) {
            const altBand = await this.bandForComune(alt, provincia, tip.propertyType, tip.codTip);
            if (altBand) {
              method = 'comune';
              confidence = 'low';
              band = altBand;
              extraWarnings.push('comune_matched_without_accent_fold');
            }
          }
        }
      }
    } else if (!provincia && provinciaRaw) {
      extraWarnings.push('provincia_unmapped');
    }

    const result = buildOmiCheck({
      method,
      confidence,
      comuneNormalized: comune,
      provinciaNormalized: provincia,
      tip: {
        codTip: tip.codTip,
        propertyType: tip.propertyType,
        usedGeneric: tip.usedGeneric,
        matchedOn: tip.matchedOn,
        source: tip.source,
      },
      band,
      superficieMq: superficie,
      prezzoBase,
      valoreStima,
      extraWarnings,
    });

    this.analytics.track(PRODUCT_EVENTS.ASTE_OMI_CHECK_COMPUTED, {
      method: result.method ?? 'none',
      available: result.available,
    });

    return result;
  }

  private async bandForLink(
    linkZona: string,
    propertyType: string,
    codTip: number,
  ): Promise<OmiBandInput | null> {
    const rows = await this.db
      .select({
        minPerM2Cents: omiQuotes.minPerM2Cents,
        maxPerM2Cents: omiQuotes.maxPerM2Cents,
        period: omiQuotes.period,
        linkZona: omiQuotes.linkZona,
        attribution: omiQuotes.attribution,
        stato: omiQuotes.stato,
        codTip: omiQuotes.codTip,
      })
      .from(omiQuotes)
      .where(and(eq(omiQuotes.linkZona, linkZona), eq(omiQuotes.type, propertyType)))
      .orderBy(desc(omiQuotes.period))
      .limit(80);

    const preferred = this.preferCodTip(rows, codTip);
    return this.aggregate(preferred, linkZona);
  }

  private async bandForComune(
    comune: string,
    provincia: string,
    propertyType: string,
    codTip: number,
  ): Promise<OmiBandInput | null> {
    const rows = await this.db
      .select({
        minPerM2Cents: omiQuotes.minPerM2Cents,
        maxPerM2Cents: omiQuotes.maxPerM2Cents,
        period: omiQuotes.period,
        linkZona: omiQuotes.linkZona,
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
      .limit(200);

    if (rows.length === 0) {
      // Case-insensitive fallback via SQL (OMI import is usually UPPER).
      const loose = await this.db.execute(sql`
        SELECT min_per_m2_cents, max_per_m2_cents, period, link_zona, attribution, stato, cod_tip
          FROM omi_quotes
         WHERE provincia = ${provincia}
           AND upper(comune) = ${comune}
           AND type = ${propertyType}
         ORDER BY period DESC
         LIMIT 200
      `);
      const mapped = (loose.rows as Array<Record<string, unknown>>).map((r) => ({
        minPerM2Cents: Number(r.min_per_m2_cents),
        maxPerM2Cents: Number(r.max_per_m2_cents),
        period: String(r.period),
        linkZona: (r.link_zona as string | null) ?? null,
        attribution: String(r.attribution ?? OMI_ATTRIBUTION),
        stato: String(r.stato ?? ''),
        codTip: Number(r.cod_tip ?? 0),
      }));
      const preferred = this.preferCodTip(mapped, codTip);
      return this.aggregate(preferred, null);
    }

    const preferred = this.preferCodTip(rows, codTip);
    return this.aggregate(preferred, null);
  }

  private preferCodTip(rows: QuoteRow[], codTip: number): QuoteRow[] {
    if (rows.length === 0) return rows;
    const period = rows[0]!.period;
    const samePeriod = rows.filter((r) => r.period === period);
    const exact = samePeriod.filter((r) => r.codTip === codTip);
    return exact.length > 0 ? exact : samePeriod;
  }

  private aggregate(rows: QuoteRow[], linkZona: string | null): OmiBandInput | null {
    if (rows.length === 0) return null;
    const mins = rows.map((r) => r.minPerM2Cents);
    const maxs = rows.map((r) => r.maxPerM2Cents);
    const minEurSqm = Math.min(...mins) / 100;
    const maxEurSqm = Math.max(...maxs) / 100;
    if (!(maxEurSqm >= minEurSqm) || !(minEurSqm > 0)) return null;
    return {
      minEurSqm,
      maxEurSqm,
      period: rows[0]!.period,
      linkZona: linkZona ?? rows[0]!.linkZona,
      attribution: rows[0]!.attribution || OMI_CHECK_ATTRIBUTION,
    };
  }
}
