import { Inject, Injectable } from '@nestjs/common';
import { and, isNull, lt, sql } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { enquiries, waInboundMessages, waThreadOutbound } from '../../db/schema';
import type { RetentionSink } from '../retention.service';

/**
 * Anonymize unconverted enquiry leads older than the cutoff (Phase 38 retention).
 * Converted enquiries (order_id set) are left alone.
 * EC-17 / EC WhatsApp: hard-delete stale WhatsApp inbound + outbound thread rows.
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
        contactWhatsappAvailable: false,
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

  async purgeWaInboundBefore(cutoff: Date): Promise<number> {
    const deletedOut = await this.db
      .delete(waThreadOutbound)
      .where(lt(waThreadOutbound.createdAt, cutoff))
      .returning({ id: waThreadOutbound.id });
    const deletedIn = await this.db
      .delete(waInboundMessages)
      .where(lt(waInboundMessages.createdAt, cutoff))
      .returning({ id: waInboundMessages.id });
    return deletedIn.length + deletedOut.length;
  }
}
