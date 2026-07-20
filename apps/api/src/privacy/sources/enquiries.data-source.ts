import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { enquiries } from '../../db/schema';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../personal-data-source';

/**
 * Enquiries PersonalDataSource — Phase 38.
 * Converted enquiries (linked to an order) are retained under legal hold.
 */
@Injectable()
export class EnquiriesDataSource implements PersonalDataSource {
  readonly source = 'enquiries';

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async collect(subjectId: string): Promise<CollectedData> {
    const rows = await this.db
      .select({
        id: enquiries.id,
        listingId: enquiries.listingId,
        intent: enquiries.intent,
        status: enquiries.status,
        message: enquiries.message,
        contactEmail: enquiries.contactEmail,
        contactPhone: enquiries.contactPhone,
        orderId: enquiries.orderId,
        createdAt: enquiries.createdAt,
      })
      .from(enquiries)
      .where(eq(enquiries.seekerUserId, subjectId));
    return {
      source: this.source,
      records: rows.map((r) => ({
        id: r.id,
        listingId: r.listingId,
        intent: r.intent,
        status: r.status,
        message: r.message,
        contactEmail: r.contactEmail,
        contactPhone: r.contactPhone,
        converted: r.orderId != null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    const rows = await this.db
      .select({ id: enquiries.id, orderId: enquiries.orderId })
      .from(enquiries)
      .where(eq(enquiries.seekerUserId, subjectId));
    const erasable = rows.filter((r) => r.orderId == null).map((r) => r.id);
    const retained = rows.length - erasable.length;
    let erased = 0;
    if (erasable.length) {
      const updated = await this.db
        .update(enquiries)
        .set({
          message: '[anonymized]',
          contactEmail: null,
          contactPhone: null,
          updatedAt: new Date(),
        })
        .where(inArray(enquiries.id, erasable))
        .returning({ id: enquiries.id });
      erased = updated.length;
    }
    return {
      source: this.source,
      erased,
      retainedUnderLegalHold: retained,
      note: retained
        ? 'converted enquiries retained (linked to a transaction)'
        : undefined,
    };
  }
}
