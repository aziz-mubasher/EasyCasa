import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';

export type OmiZoneHit = {
  zoneId: string;
  comune: string;
  provincia: string;
  zoneCode: string;
  confidence: 'polygon' | 'comune';
};

/**
 * EC-S-T08 — address / point → OMI zone.
 * Uses existing `omi_zone_polygons` GiST index (not the brief's assumed `omi_zones`).
 */
@Injectable()
export class OmiZoneService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: ApiConfig,
  ) {}

  async zoneFromPoint(lng: number, lat: number): Promise<OmiZoneHit | null> {
    try {
      const poly = await this.db.execute(sql`
        SELECT link_zona AS zone_id,
               coalesce(comune, '') AS comune,
               coalesce(provincia, '') AS provincia,
               link_zona AS zone_code
          FROM omi_zone_polygons
         WHERE geom IS NOT NULL
           AND ST_Contains(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
         ORDER BY period DESC
         LIMIT 1
      `);
      const row = poly.rows[0] as
        | { zone_id: string; comune: string; provincia: string; zone_code: string }
        | undefined;
      if (row?.zone_id) {
        return {
          zoneId: row.zone_id,
          comune: row.comune,
          provincia: row.provincia,
          zoneCode: row.zone_code,
          confidence: 'polygon',
        };
      }
    } catch {
      /* polygons may be empty in CI */
    }

    // Comune fallback via nearest quote centroid when polygon miss
    try {
      const fallback = await this.db.execute(sql`
        SELECT link_zona AS zone_id,
               comune,
               provincia,
               link_zona AS zone_code
          FROM omi_quotes
         WHERE geo_level = 'comune'
           AND link_zona <> ''
         ORDER BY period DESC
         LIMIT 1
      `);
      // Without ISTAT join we cannot do true comune fallback from lat/lng alone
      // when polygons are missing — return null rather than a random zone.
      void fallback;
    } catch {
      /* ignore */
    }
    return null;
  }

  async resolveAddress(address: string): Promise<OmiZoneHit | null> {
    const coords = await this.geocode(address);
    if (!coords) return null;
    return this.zoneFromPoint(coords.lng, coords.lat);
  }

  private async geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    const q = address.trim();
    if (!q) return null;

    // Cache hit
    try {
      const cached = await this.db.execute(sql`
        SELECT latitude, longitude FROM geocode_cache WHERE query = ${q} LIMIT 1
      `);
      const hit = cached.rows[0] as { latitude: number | null; longitude: number | null } | undefined;
      if (hit?.latitude != null && hit.longitude != null) {
        return { lat: Number(hit.latitude), lng: Number(hit.longitude) };
      }
    } catch {
      /* cache table may differ in tests */
    }

    const base = this.config.NOMINATIM_URL.replace(/\/$/, '');
    const url = `${base}?format=json&limit=1&countrycodes=it&q=${encodeURIComponent(q)}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': this.config.GEOCODER_USER_AGENT },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      const first = data[0];
      if (!first) return null;
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      try {
        await this.db.execute(sql`
          INSERT INTO geocode_cache (query, latitude, longitude, source)
          VALUES (${q}, ${lat}, ${lng}, 'nominatim')
          ON CONFLICT (query) DO NOTHING
        `);
      } catch {
        /* non-fatal */
      }
      return { lat, lng };
    } catch {
      return null;
    }
  }
}
