import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { viewings } from '../../db/schema';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../personal-data-source';

/** Confirmed/completed viewings retained as evidence of the appointment. */
const HOLD_STATUSES = new Set(['CONFIRMED', 'COMPLETED', 'NO_SHOW']);

@Injectable()
export class ViewingsDataSource implements PersonalDataSource {
  readonly source = 'viewings';

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async collect(subjectId: string): Promise<CollectedData> {
    const rows = await this.db
      .select({
        id: viewings.id,
        listingId: viewings.listingId,
        status: viewings.status,
        startAt: viewings.startAt,
        endAt: viewings.endAt,
        createdAt: viewings.createdAt,
      })
      .from(viewings)
      .where(eq(viewings.seekerUserId, subjectId));
    return {
      source: this.source,
      records: rows.map((r) => ({
        id: r.id,
        listingId: r.listingId,
        status: r.status,
        startAt: r.startAt.toISOString(),
        endAt: r.endAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    const rows = await this.db
      .select({ id: viewings.id, status: viewings.status })
      .from(viewings)
      .where(eq(viewings.seekerUserId, subjectId));
    const erasable = rows.filter((r) => !HOLD_STATUSES.has(r.status)).map((r) => r.id);
    const retained = rows.length - erasable.length;
    let erased = 0;
    if (erasable.length) {
      // Soft-cancel REQUESTED/CANCELLED rows by marking CANCELLED (no PII columns).
      const updated = await this.db
        .update(viewings)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(inArray(viewings.id, erasable))
        .returning({ id: viewings.id });
      erased = updated.length;
    }
    return {
      source: this.source,
      erased,
      retainedUnderLegalHold: retained,
      note: retained ? 'confirmed/completed viewings retained' : undefined,
    };
  }
}
