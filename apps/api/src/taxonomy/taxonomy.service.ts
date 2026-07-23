import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { categories, provinces, regions } from '../db/schema';

@Injectable()
export class TaxonomyService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}
  listCategories() { return this.db.select().from(categories).orderBy(asc(categories.name)); }
  listRegions() { return this.db.select().from(regions).orderBy(asc(regions.name)); }
  listProvinces(regionSlug?: string) {
    if (regionSlug) {
      return this.db.select().from(provinces).where(eq(provinces.regionSlug, regionSlug)).orderBy(asc(provinces.name));
    }
    return this.db.select().from(provinces).orderBy(asc(provinces.name));
  }
}
