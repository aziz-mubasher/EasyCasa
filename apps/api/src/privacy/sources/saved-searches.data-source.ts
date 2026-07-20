import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { savedSearches } from '../../db/schema';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../personal-data-source';

@Injectable()
export class SavedSearchesDataSource implements PersonalDataSource {
  readonly source = 'saved_searches';

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async collect(subjectId: string): Promise<CollectedData> {
    const rows = await this.db
      .select({
        id: savedSearches.id,
        name: savedSearches.name,
        query: savedSearches.query,
        notify: savedSearches.notify,
        frequency: savedSearches.frequency,
        createdAt: savedSearches.createdAt,
      })
      .from(savedSearches)
      .where(eq(savedSearches.userId, subjectId));
    return {
      source: this.source,
      records: rows.map((r) => ({
        id: r.id,
        name: r.name,
        query: r.query,
        notify: r.notify,
        frequency: r.frequency,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    const deleted = await this.db
      .delete(savedSearches)
      .where(eq(savedSearches.userId, subjectId))
      .returning({ id: savedSearches.id });
    return { source: this.source, erased: deleted.length, retainedUnderLegalHold: 0 };
  }
}
