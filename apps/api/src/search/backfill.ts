import {
  deriveLegacyCategorySlug,
  isConditionSlug,
  isPropertyTypeSlug,
  normalizeProvinceSlug,
  type AssetClassSlug,
  type ConditionSlug,
  type FinancingOptionSlug,
  type LeaseTypeSlug,
  type PropertyTypeSlug,
  type SellerTypeSlug,
  type TransactionTypeSlug,
} from '@easycasa/shared';
import { pool } from '../db/drizzle';
import { SearchService } from './search.service';
import type { ListingDoc } from './meili';

/** One-off/CLI: push all published listings into Meilisearch. */
async function run(): Promise<void> {
  const svc = new SearchService();
  await svc.ensureSettings();

  const { rows } = await pool.query<{
    id: string; slug: string | null; title: string; description: string | null;
    city: string | null; province: string | null; region_slug: string | null; category_slug: string | null;
    transaction_type: TransactionTypeSlug | null; price: string | null;
    bedrooms: number | null; bathrooms: number | null; rooms: number | null;
    size_sqm: string | null; energy_class: string | null;
    latitude: number | null; longitude: number | null; status: string;
    cover_url: string | null; published_at: Date | null;
    asset_class: string | null; property_type: string | null; condition: string | null;
    financing_options: string[] | null; lease_type: string | null; seller_type: string | null;
  }>(`
    SELECT l.id, l.slug, l.title, l.description, l.city, l.province,
           r.slug AS region_slug, c.slug AS category_slug,
           l.transaction_type, l.price, l.bedrooms, l.bathrooms, l.rooms, l.size_sqm,
           l.energy_class,
           l.latitude, l.longitude, l.status,
           l.asset_class, l.property_type, l.condition, l.financing_options, l.lease_type, l.seller_type,
           (SELECT url FROM media m WHERE m.listing_id = l.id ORDER BY m.position LIMIT 1) AS cover_url,
           l.published_at
      FROM listings l
      LEFT JOIN regions r ON r.id = l.region_id
      LEFT JOIN categories c ON c.id = l.category_id
     WHERE l.status = 'published'
  `);

  const docs: ListingDoc[] = rows.map((r) => {
    const assetClass = (r.asset_class as AssetClassSlug | null) ?? null;
    const propertyType = isPropertyTypeSlug(r.property_type ?? '')
      ? (r.property_type as PropertyTypeSlug)
      : null;
    const condition = isConditionSlug(r.condition ?? '')
      ? (r.condition as ConditionSlug)
      : null;
    const financingOptions = (r.financing_options ?? []) as FinancingOptionSlug[];
    const leaseType = (r.lease_type as LeaseTypeSlug | null) ?? null;
    const sellerType = (r.seller_type as SellerTypeSlug | null) ?? null;
    const transactionType = r.transaction_type;
    const derived = deriveLegacyCategorySlug({
      transactionType,
      assetClass,
      propertyType,
      condition,
      financingOptions,
    });

    return {
      id: r.id,
      slug: r.slug ?? r.id,
      title: r.title,
      description: r.description,
      city: r.city,
      provinceSlug: normalizeProvinceSlug(r.province),
      regionSlug: r.region_slug,
      categorySlug: r.category_slug ?? derived,
      transactionType,
      assetClass,
      propertyType,
      condition,
      financingOptions,
      leaseType,
      sellerType,
      price: r.price == null ? null : Number(r.price),
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      rooms: r.rooms ?? r.bedrooms,
      sizeSqm: r.size_sqm == null ? null : Number(r.size_sqm),
      energyClass: r.energy_class,
      coverUrl: r.cover_url,
      status: r.status,
      _geo: r.latitude != null && r.longitude != null
        ? { lat: r.latitude, lng: r.longitude }
        : undefined,
      publishedAt: r.published_at ? r.published_at.getTime() : null,
    };
  });

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
