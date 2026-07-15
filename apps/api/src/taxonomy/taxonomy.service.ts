import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { categories, regions } from '../db/schema';

@Injectable()
export class TaxonomyService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}
  listCategories() { return this.db.select().from(categories).orderBy(asc(categories.name)); }
  listRegions() { return this.db.select().from(regions).orderBy(asc(regions.name)); }
}
