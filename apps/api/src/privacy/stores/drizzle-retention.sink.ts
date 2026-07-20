import { Inject, Injectable } from '@nestjs/common';
import { and, isNull, lt, sql } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { enquiries } from '../../db/schema';
import type { RetentionSink } from '../retention.service';

/**
 * Anonymize unconverted enquiry leads older than the cutoff (Phase 38 retention).
 * Converted enquiries (order_id set) are left alone.
 */
@Injectable()
export class DrizzleRetentionSink implements RetentionSink {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async anonymizeStaleLeadsBefore(cutoff: Date): Promise<number> {
    const result = await this.db
      .update(enquiries)
      .set({
        message: '[anonymized]',
        contactEmail: null,
        contactPhone: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          isNull(enquiries.orderId),
          lt(enquiries.createdAt, cutoff),
          sql`${enquiries.message} <> '[anonymized]'`,
        ),
      )
      .returning({ id: enquiries.id });
    return result.length;
  }
}
