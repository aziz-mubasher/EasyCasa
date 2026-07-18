import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  InvoiceRecord,
  InvoiceRepository,
  PaymentIntentRecord,
  SdIChannel,
} from '../payments/domain/ports';
import type { PaymentSucceededHandler } from '../payments/payments.service';
import type { PaymentPurpose } from '../payments/domain/types';
import type { Invoice } from './domain/fattura';
import { INVOICE_SOURCE, type InvoiceSource } from './order-invoice.source';

export const INVOICE_REPOSITORY = Symbol('INVOICE_REPOSITORY');
export const SDI_CHANNEL = Symbol('SDI_CHANNEL');

@Injectable()
export class InvoicingService {
  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly repo: InvoiceRepository,
    @Inject(SDI_CHANNEL) private readonly sdi: SdIChannel,
    @Inject(INVOICE_SOURCE) private readonly source: InvoiceSource,
  ) {}

  /**
   * Read-only fattura totals for checkout (no persistence / no SdI).
   * Uses the same InvoiceSource as issueForOrder so preview and issue cannot drift.
   */
  async previewForOrder(
    orderId: string,
    purpose: PaymentPurpose = 'DUE_NOW',
  ): Promise<Invoice> {
    return this.source.buildForOrder(orderId, purpose);
  }

  async issueForOrder(
    orderId: string,
    purpose: PaymentPurpose = 'DUE_NOW',
    paymentIntentId?: string | null,
  ): Promise<InvoiceRecord> {
    const invoice = await this.source.buildForOrder(orderId, purpose);
    const record = await this.repo.create(orderId, invoice, paymentIntentId);
    const receipt = await this.sdi.transmit(invoice);
    await this.repo.setTransmission(record.id, receipt.protocollo, receipt.transmittedAt);
    return {
      ...record,
      sdiProtocollo: receipt.protocollo,
      transmittedAt: receipt.transmittedAt,
    };
  }

  async get(id: string): Promise<InvoiceRecord> {
    const rec = await this.repo.get(id);
    if (!rec) throw new NotFoundException(`Invoice ${id} not found`);
    return rec;
  }
}

/** Auto-issue fattura when a payment intent succeeds. */
@Injectable()
export class InvoiceOnPaymentSucceeded implements PaymentSucceededHandler {
  constructor(private readonly invoicing: InvoicingService) {}

  async onPaymentSucceeded(intent: PaymentIntentRecord): Promise<void> {
    await this.invoicing.issueForOrder(intent.orderId, intent.purpose, intent.id);
  }
}
