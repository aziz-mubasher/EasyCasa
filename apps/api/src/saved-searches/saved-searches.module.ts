import { Inject, Injectable, Module } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import {
  SAVED_SEARCH_REPOSITORY,
  type SavedSearchRepository,
} from '../alerts/domain/ports';
import type { AlertFrequency, SavedSearch, SavedSearchCriteria } from '../alerts/domain/types';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { savedSearches } from '../db/schema';
import { UsersModule } from '../users/users.module';
import { SavedSearchesController } from './saved-searches.controller';
import { SavedSearchesService } from './saved-searches.service';

type Row = typeof savedSearches.$inferSelect;

@Injectable()
export class DrizzleSavedSearchRepository implements SavedSearchRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private toDomain(r: Row): SavedSearch {
    const raw = r.query as SavedSearchCriteria | { filters?: unknown } | null;
    const criteria: SavedSearchCriteria =
      raw && typeof raw === 'object' && 'filters' in raw
        ? (raw as SavedSearchCriteria)
        : { filters: (raw as SavedSearchCriteria)?.filters ?? {} };

    return {
      id: r.id,
      userId: r.userId,
      name: r.name,
      criteria,
      frequency: (r.frequency as AlertFrequency) || 'instant',
      lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
    };
  }

  async create(input: {
    userId: string;
    name: string;
    criteria: SavedSearchCriteria;
    frequency: AlertFrequency;
  }): Promise<SavedSearch> {
    const [r] = await this.db
      .insert(savedSearches)
      .values({
        userId: input.userId,
        name: input.name,
        query: input.criteria as object,
        frequency: input.frequency,
        notify: input.frequency !== 'off',
        updatedAt: new Date(),
      })
      .returning();
    return this.toDomain(r);
  }

  async listForUser(userId: string): Promise<SavedSearch[]> {
    const rows = await this.db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.createdAt));
    return rows.map((r) => this.toDomain(r));
  }

  async get(id: string): Promise<SavedSearch | null> {
    const rows = await this.db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.id, id))
      .limit(1);
    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async listByFrequency(frequency: AlertFrequency): Promise<SavedSearch[]> {
    const rows = await this.db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.frequency, frequency));
    return rows.map((r) => this.toDomain(r));
  }

  async setFrequency(id: string, frequency: AlertFrequency): Promise<void> {
    await this.db
      .update(savedSearches)
      .set({ frequency, notify: frequency !== 'off', updatedAt: new Date() })
      .where(eq(savedSearches.id, id));
  }

  async setLastRunAt(id: string, iso: string): Promise<void> {
    await this.db
      .update(savedSearches)
      .set({ lastRunAt: new Date(iso), updatedAt: new Date() })
      .where(eq(savedSearches.id, id));
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.db
      .delete(savedSearches)
      .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)));
  }
}

@Module({
  imports: [UsersModule],
  controllers: [SavedSearchesController],
  providers: [
    SavedSearchesService,
    { provide: SAVED_SEARCH_REPOSITORY, useClass: DrizzleSavedSearchRepository },
  ],
  exports: [SavedSearchesService, SAVED_SEARCH_REPOSITORY],
})
export class SavedSearchesModule {}
