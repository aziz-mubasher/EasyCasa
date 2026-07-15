import pLimit from 'p-limit';
import { pgPool } from './db.js';
import { config } from './config.js';
import { log } from './logger.js';

/**
 * Geocode listings missing coordinates. Default provider is OSM Nominatim,
 * which requires <=1 req/sec and a valid User-Agent. For production volume,
 * swap NOMINATIM_URL for a paid geocoder. Results are cached in geocode_cache.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geocodeQuery(query: string): Promise<{ lat: number; lon: number } | null> {
  const cached = await pgPool.query<{ latitude: number; longitude: number }>(
    'SELECT latitude, longitude FROM geocode_cache WHERE query = $1',
    [query],
  );
  if (cached.rows[0]?.latitude != null) {
    return { lat: cached.rows[0].latitude, lon: cached.rows[0].longitude };
  }

  const url = `${config.NOMINATIM_URL}?format=json&limit=1&countrycodes=it&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': config.GEOCODER_USER_AGENT },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    log.warn(`geocode HTTP ${res.status} for "${query}"`);
    return null;
  }
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  const hit = data[0] ? { lat: Number(data[0].lat), lon: Number(data[0].lon) } : null;

  await pgPool.query(
    `INSERT INTO geocode_cache (query, latitude, longitude, source)
     VALUES ($1,$2,$3,'nominatim')
     ON CONFLICT (query) DO NOTHING`,
    [query, hit?.lat ?? null, hit?.lon ?? null],
  );
  await sleep(1100); // respect Nominatim rate limit
  return hit;
}

async function run(): Promise<void> {
  if (config.GEOCODER === 'none') {
    log.info('GEOCODER=none, skipping');
    return;
  }
  const { rows } = await pgPool.query<{
    id: string; address: string | null; city: string | null; province: string | null; postal_code: string | null;
  }>(
    `SELECT id, address, city, province, postal_code
       FROM listings
      WHERE (latitude IS NULL OR longitude IS NULL)
        AND (address IS NOT NULL OR city IS NOT NULL)`,
  );
  log.info(`listings to geocode: ${rows.length}`);

  const limit = pLimit(1); // serialize to honor rate limit
  let ok = 0;
  await Promise.all(
    rows.map((r) =>
      limit(async () => {
        const query = [r.address, r.postal_code, r.city, r.province, 'Italy']
          .filter(Boolean)
          .join(', ');
        const hit = await geocodeQuery(query);
        if (!hit) return;
        await pgPool.query(
          `UPDATE listings
              SET latitude=$2, longitude=$3,
                  location = ST_SetSRID(ST_MakePoint($3,$2),4326)::geography,
                  geocoded_at = now(), geocode_source = 'nominatim'
            WHERE id=$1`,
          [r.id, hit.lat, hit.lon],
        );
        ok++;
      }),
    ),
  );
  log.info(`geocoded ${ok}/${rows.length}`);
  await pgPool.end();
}

run().catch((e) => {
  log.error('geocode crashed', e);
  process.exit(1);
});
