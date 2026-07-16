import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { listings } from '../db/schema';
import type { QueryListingDto } from './dto/query-listing.dto';
import { offset } from '../common/pagination';
import type { ListingSummary, Paginated } from '@easycasa/shared';

@Injectable()
export class ListingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findById(id: string) {
    const rows = await this.db.select().from(listings).where(eq(listings.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findBySlug(slug: string) {
    const rows = await this.db.select().from(listings).where(eq(listings.slug, slug)).limit(1);
    return rows[0] ?? null;
  }

  async sitemapRefs(): Promise<Array<{ slug: string; updatedAt: string }>> {
    const rows = await this.db
      .select({
        slug: listings.slug,
        updatedAt: listings.updatedAt,
        publishedAt: listings.publishedAt,
      })
      .from(listings)
      .where(eq(listings.status, 'published'))
      .orderBy(desc(listings.publishedAt))
      .limit(5000);
    return rows
      .filter((r) => r.slug != null)
      .map((r) => ({
        slug: r.slug as string,
        updatedAt: (r.updatedAt ?? r.publishedAt ?? new Date()).toISOString(),
      }));
  }

  async insert(values: typeof listings.$inferInsert) {
    const rows = await this.db.insert(listings).values(values).returning();
    return rows[0];
  }

  async update(id: string, values: Partial<typeof listings.$inferInsert>) {
    const rows = await this.db
      .update(listings)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(listings.id, id))
      .returning();
    return rows[0] ?? null;
  }

  /** Keep PostGIS point in sync (raw — geography isn't a drizzle column type here). */
  async syncLocation(id: string, lat: number, lng: number) {
    await this.db.execute(
      sql`UPDATE listings
             SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
           WHERE id = ${id}`,
    );
  }

  /** Paginated search with filters + optional geo bounds. */
  async search(q: QueryListingDto): Promise<Paginated<ListingSummary>> {
    const conds = [eq(listings.status, 'published')];
    if (q.transactionType) conds.push(eq(listings.transactionType, q.transactionType));
    if (q.minPrice != null) conds.push(gte(listings.price, String(q.minPrice)));
    if (q.maxPrice != null) conds.push(lte(listings.price, String(q.maxPrice)));
    if (q.minBedrooms != null) conds.push(gte(listings.bedrooms, q.minBedrooms));
    if (q.categorySlug) {
      conds.push(sql`${listings.categoryId} = (SELECT id FROM categories WHERE slug = ${q.categorySlug})`);
    }
    if (q.regionSlug) {
      conds.push(sql`${listings.regionId} = (SELECT id FROM regions WHERE slug = ${q.regionSlug})`);
    }
    if (q.minLat != null && q.minLng != null && q.maxLat != null && q.maxLng != null) {
      conds.push(
        sql`location && ST_MakeEnvelope(${q.minLng}, ${q.minLat}, ${q.maxLng}, ${q.maxLat}, 4326)::geography`,
      );
    }
    const where = and(...conds);

    const totalRows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(listings)
      .where(where);
    const total = totalRows[0]?.n ?? 0;

    const rows = await this.db
      .select({
        id: listings.id, slug: listings.slug, title: listings.title, price: listings.price,
        currency: listings.currency, transactionType: listings.transactionType,
        bedrooms: listings.bedrooms, bathrooms: listings.bathrooms, sizeSqm: listings.sizeSqm,
        city: listings.city, latitude: listings.latitude, longitude: listings.longitude,
        status: listings.status,
        coverUrl: sql<string | null>`(SELECT url FROM media m WHERE m.listing_id = listings.id ORDER BY m.position LIMIT 1)`,
      })
      .from(listings)
      .where(where)
      .orderBy(desc(listings.publishedAt))
      .limit(q.pageSize)
      .offset(offset({ page: q.page, pageSize: q.pageSize }));

    const items: ListingSummary[] = rows.map((r) => ({
      id: r.id, slug: r.slug ?? r.id, title: r.title,
      price: r.price == null ? null : Number(r.price),
      currency: r.currency, transactionType: r.transactionType,
      bedrooms: r.bedrooms, bathrooms: r.bathrooms,
      sizeSqm: r.sizeSqm == null ? null : Number(r.sizeSqm),
      city: r.city, latitude: r.latitude, longitude: r.longitude,
      status: r.status, coverUrl: r.coverUrl ?? null,
    }));

    return { items, total, page: q.page, pageSize: q.pageSize };
  }
}
