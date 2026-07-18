import { pool } from '../db/drizzle';
import { SearchService } from './search.service';
import type { ListingDoc } from './meili';
import { inferPropertyType } from './meili-search.index';

/** One-off/CLI: push all published listings into Meilisearch. */
async function run(): Promise<void> {
  const svc = new SearchService();
  await svc.ensureSettings();

  const { rows } = await pool.query<{
    id: string; slug: string | null; title: string; description: string | null;
    city: string | null; region_slug: string | null; category_slug: string | null;
    transaction_type: 'sale' | 'rent' | null; price: string | null;
    bedrooms: number | null; bathrooms: number | null; rooms: number | null;
    size_sqm: string | null; energy_class: string | null;
    latitude: number | null; longitude: number | null; status: string;
    cover_url: string | null; published_at: Date | null;
  }>(`
    SELECT l.id, l.slug, l.title, l.description, l.city,
           r.slug AS region_slug, c.slug AS category_slug,
           l.transaction_type, l.price, l.bedrooms, l.bathrooms, l.rooms, l.size_sqm,
           l.energy_class,
           l.latitude, l.longitude, l.status,
           (SELECT url FROM media m WHERE m.listing_id = l.id ORDER BY m.position LIMIT 1) AS cover_url,
           l.published_at
      FROM listings l
      LEFT JOIN regions r ON r.id = l.region_id
      LEFT JOIN categories c ON c.id = l.category_id
     WHERE l.status = 'published'
  `);

  const docs: ListingDoc[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug ?? r.id,
    title: r.title,
    description: r.description,
    city: r.city,
    regionSlug: r.region_slug,
    categorySlug: r.category_slug,
    transactionType: r.transaction_type,
    price: r.price == null ? null : Number(r.price),
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    rooms: r.rooms ?? r.bedrooms,
    sizeSqm: r.size_sqm == null ? null : Number(r.size_sqm),
    propertyType: inferPropertyType(r.category_slug),
    energyClass: r.energy_class,
    coverUrl: r.cover_url,
    status: r.status,
    _geo: r.latitude != null && r.longitude != null
      ? { lat: r.latitude, lng: r.longitude }
      : undefined,
    publishedAt: r.published_at ? r.published_at.getTime() : null,
  }));

  for (let i = 0; i < docs.length; i += 1000) {
    await svc.indexBatch(docs.slice(i, i + 1000));
  }
  console.log(`indexed ${docs.length} listings`);
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
