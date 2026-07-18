import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { paymentIntents } from '../db/schema';
import type { PaymentIntentRecord, PaymentRepository } from './domain/ports';
import type { PaymentPurpose, PaymentStatus } from './domain/types';
import {
  toDbPaymentPurpose,
  toDbPaymentStatus,
  toDomainPaymentPurpose,
  toDomainPaymentStatus,
} from './status-map';

@Injectable()
export class DrizzlePaymentRepository implements PaymentRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async create(input: {
    orderId: string;
    purpose: PaymentPurpose;
    amountCents: number;
  }): Promise<PaymentIntentRecord> {
    const rows = await this.db
      .insert(paymentIntents)
      .values({
        orderId: input.orderId,
        purpose: toDbPaymentPurpose(input.purpose),
        amountCents: input.amountCents,
        status: 'requires_payment',
      })
      .returning();
    return this.toRecord(rows[0]!);
  }

  async get(id: string): Promise<PaymentIntentRecord | null> {
    const rows = await this.db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, id))
      .limit(1);
    return rows[0] ? this.toRecord(rows[0]) : null;
  }

  async findByProviderRef(ref: string): Promise<PaymentIntentRecord | null> {
    const rows = await this.db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.providerRef, ref))
      .limit(1);
    return rows[0] ? this.toRecord(rows[0]) : null;
  }

  async setStatus(id: string, status: PaymentStatus): Promise<void> {
    await this.db
      .update(paymentIntents)
      .set({ status: toDbPaymentStatus(status), updatedAt: new Date() })
      .where(eq(paymentIntents.id, id));
  }

  async setProviderRef(id: string, ref: string): Promise<void> {
    await this.db
      .update(paymentIntents)
      .set({ providerRef: ref, updatedAt: new Date() })
      .where(eq(paymentIntents.id, id));
  }

  private toRecord(row: typeof paymentIntents.$inferSelect): PaymentIntentRecord {
    return {
      id: row.id,
      orderId: row.orderId,
      purpose: toDomainPaymentPurpose(row.purpose),
      amountCents: row.amountCents,
      status: toDomainPaymentStatus(row.status),
      providerRef: row.providerRef,
    };
  }
}
