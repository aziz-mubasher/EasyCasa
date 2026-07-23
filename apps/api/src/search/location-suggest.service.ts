import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  COMUNE_TO_PROVINCE,
  ITALIAN_PROVINCES,
  PROVINCE_BY_SLUG,
  REGION_NAMES,
  type LocationSuggestion,
} from '@easycasa/shared';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';

@Injectable()
export class LocationSuggestService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async suggest(query: string): Promise<LocationSuggestion[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const out: LocationSuggestion[] = [];
    const seen = new Set<string>();

    const push = (s: LocationSuggestion) => {
      const key = `${s.kind}:${s.slug}:${s.label}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(s);
    };

    // Comuni from published listings + static mapping.
    const { rows: cities } = await this.db.execute<{ city: string }>(sql`
      SELECT DISTINCT city FROM listings
       WHERE status = 'published' AND city IS NOT NULL AND city <> ''
    `);
    const citySet = new Set<string>();
    for (const r of cities) citySet.add(r.city);
    for (const city of Object.keys(COMUNE_TO_PROVINCE)) {
      citySet.add(city.replace(/\b\w/g, (c) => c.toUpperCase()));
    }

    for (const raw of citySet) {
      if (!raw.toLowerCase().includes(q)) continue;
      const sigla = COMUNE_TO_PROVINCE[raw.toLowerCase()] ?? null;
      const prov = sigla ? PROVINCE_BY_SLUG.get(sigla) : undefined;
      const regionSlug = prov?.regionSlug;
      const regionName = regionSlug ? REGION_NAMES[regionSlug] : undefined;
      const provName = prov?.name;
      const hierarchy = provName && regionName
        ? `${raw} — Comune · ${provName} — Provincia · ${regionName} — Regione`
        : `${raw} — Comune`;
      push({
        kind: 'comune',
        label: raw,
        slug: raw.toLowerCase(),
        provinceSlug: sigla ?? undefined,
        regionSlug,
        hierarchy,
      });
      if (out.length >= 12) break;
    }

    for (const p of ITALIAN_PROVINCES) {
      if (out.length >= 15) break;
      if (!p.name.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q)) continue;
      const regionName = REGION_NAMES[p.regionSlug] ?? p.regionSlug;
      push({
        kind: 'provincia',
        label: p.name,
        slug: p.slug,
        provinceSlug: p.slug,
        regionSlug: p.regionSlug,
        hierarchy: `${p.name} — Provincia · ${regionName} — Regione`,
      });
    }

    for (const [slug, name] of Object.entries(REGION_NAMES)) {
      if (out.length >= 18) break;
      if (!name.toLowerCase().includes(q) && !slug.includes(q)) continue;
      push({
        kind: 'regione',
        label: name,
        slug,
        regionSlug: slug,
        hierarchy: `${name} — Regione`,
      });
    }

    return out.slice(0, 18);
  }
}
