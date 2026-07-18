import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { invoices } from '../db/schema';
import type { Invoice } from './domain/fattura';
import type { InvoiceRecord, InvoiceRepository } from '../payments/domain/ports';

@Injectable()
export class DrizzleInvoiceRepository implements InvoiceRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async create(
    orderId: string,
    invoice: Invoice,
    paymentIntentId?: string | null,
  ): Promise<InvoiceRecord> {
    const rows = await this.db
      .insert(invoices)
      .values({
        orderId,
        paymentIntentId: paymentIntentId ?? null,
        totaleDocumentoCents: invoice.totaleDocumentoCents,
        payload: invoice as unknown as object,
      })
      .returning();
    const row = rows[0]!;
    return {
      id: row.id,
      orderId,
      paymentIntentId: row.paymentIntentId,
      totaleDocumentoCents: invoice.totaleDocumentoCents,
      sdiProtocollo: null,
      transmittedAt: null,
      invoice,
    };
  }

  async get(id: string): Promise<InvoiceRecord | null> {
    const rows = await this.db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      orderId: row.orderId,
      paymentIntentId: row.paymentIntentId,
      totaleDocumentoCents: row.totaleDocumentoCents,
      sdiProtocollo: row.sdiProtocollo,
      transmittedAt: row.transmittedAt ? row.transmittedAt.toISOString() : null,
      invoice: row.payload as unknown as Invoice,
    };
  }

  async setTransmission(id: string, protocollo: string, transmittedAt: string): Promise<void> {
    await this.db
      .update(invoices)
      .set({
        sdiProtocollo: protocollo,
        transmittedAt: new Date(transmittedAt),
      })
      .where(eq(invoices.id, id));
  }
}
