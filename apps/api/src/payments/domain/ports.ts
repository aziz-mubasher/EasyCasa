import type { PaymentPurpose, PaymentStatus } from './types';
import type { Invoice } from '../../invoicing/domain/fattura';

export interface PaymentIntentRecord {
  id: string;
  orderId: string;
  purpose: PaymentPurpose;
  amountCents: number;
  status: PaymentStatus;
  providerRef: string | null;
}

export interface PaymentRepository {
  create(input: {
    orderId: string;
    purpose: PaymentPurpose;
    amountCents: number;
  }): Promise<PaymentIntentRecord>;
  get(id: string): Promise<PaymentIntentRecord | null>;
  findByProviderRef(ref: string): Promise<PaymentIntentRecord | null>;
  setStatus(id: string, status: PaymentStatus): Promise<void>;
  setProviderRef(id: string, ref: string): Promise<void>;
}

export interface PaymentProvider {
  createIntent(input: {
    amountCents: number;
    currency: 'eur';
    reference: string;
  }): Promise<{ providerRef: string; clientSecret: string }>;
  refund(providerRef: string): Promise<void>;
}

export interface InvoiceRecord {
  id: string;
  orderId: string;
  paymentIntentId: string | null;
  totaleDocumentoCents: number;
  sdiProtocollo: string | null;
  transmittedAt: string | null;
  invoice: Invoice;
}

export interface InvoiceRepository {
  create(
    orderId: string,
    invoice: Invoice,
    paymentIntentId?: string | null,
  ): Promise<InvoiceRecord>;
  get(id: string): Promise<InvoiceRecord | null>;
  setTransmission(id: string, protocollo: string, transmittedAt: string): Promise<void>;
}

export interface SdIChannel {
  transmit(invoice: Invoice): Promise<{ protocollo: string; transmittedAt: string }>;
}
