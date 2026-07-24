import { Inject, Injectable, Logger } from '@nestjs/common';
import { ITALIAN_PROVINCES } from '@easycasa/shared';
import { asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { categories, provinces, regions } from '../db/schema';

@Injectable()
export class TaxonomyService {
  private readonly log = new Logger(TaxonomyService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  listCategories() {
    return this.db.select().from(categories).orderBy(asc(categories.name));
  }

  listRegions() {
    return this.db.select().from(regions).orderBy(asc(regions.name));
  }

  async listProvinces(regionSlug?: string) {
    try {
      const rows = regionSlug
        ? await this.db
            .select()
            .from(provinces)
            .where(eq(provinces.regionSlug, regionSlug))
            .orderBy(asc(provinces.name))
        : await this.db.select().from(provinces).orderBy(asc(provinces.name));
      if (rows.length > 0) return rows;
    } catch (err) {
      this.log.warn(
        `provinces table unavailable; falling back to shared list: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const fallback = ITALIAN_PROVINCES.map((p) => ({
      slug: p.slug,
      name: p.name,
      regionSlug: p.regionSlug,
      createdAt: new Date(0),
    }));
    const filtered = regionSlug ? fallback.filter((p) => p.regionSlug === regionSlug) : fallback;
    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }
}
