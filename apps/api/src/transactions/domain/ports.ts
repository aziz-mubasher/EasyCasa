import type {
  LegalBasis,
  MandateDerivation,
  MandateStatus,
  MandateTerms,
  MandateType,
  OrderStatus,
  QuoteRequest,
  QuoteResult,
} from './types';

/**
 * Pricing port — implemented by an adapter over the Phase 8 service-catalog
 * domain. Keeps the order/mandate services decoupled from the pricing package.
 */
export interface PricingPort {
  /** Authoritative server-side quote (never trust client totals). */
  quote(req: QuoteRequest): QuoteResult;
  /** Flat underlying item codes (packages expanded). */
  resolveItemCodes(req: QuoteRequest): string[];
  /** Configured legal basis for a catalog item. */
  legalBasisOf(itemCode: string): LegalBasis;
}

export interface OrderLineRecord {
  itemCode: string;
  kind: string;
  netCents: number;
  ivaCents: number;
  grossCents: number;
  estimated: boolean;
}

export interface OrderRecord {
  id: string;
  propertyId: string;
  packageCode: string | null;
  status: OrderStatus;
  itemCodes: string[];
  lines: OrderLineRecord[];
  dueNowGrossCents: number;
  estimatedTotalGrossCents: number;
}

export interface OrderRepository {
  create(input: Omit<OrderRecord, 'id' | 'status'> & { status: OrderStatus }): Promise<OrderRecord>;
  get(id: string): Promise<OrderRecord | null>;
  setStatus(id: string, status: OrderStatus): Promise<void>;
}

export interface MandateRecord {
  id: string;
  orderId: string;
  propertyId: string;
  types: MandateType[];
  reviewRequiredItems: string[];
  status: MandateStatus;
  exclusive: boolean;
  durationMonths: number;
  signatureEnvelopeId: string | null;
  signingUrl: string | null;
  signedAt: string | null;
}

export interface MandateRepository {
  create(input: {
    orderId: string;
    propertyId: string;
    derivation: MandateDerivation;
    terms: MandateTerms;
  }): Promise<MandateRecord>;
  get(id: string): Promise<MandateRecord | null>;
  findByEnvelope(envelopeId: string): Promise<MandateRecord | null>;
  setStatus(id: string, status: MandateStatus): Promise<void>;
  attachEnvelope(id: string, envelopeId: string, signingUrl: string): Promise<void>;
  markSigned(id: string, signedAt: string): Promise<void>;
}

/**
 * E-signature provider port. The provider hosts the actual signing UI; the
 * signer authenticates (SPID/CIE) and signs THERE. EasyCasa never fabricates a
 * signature — it only creates the envelope and records the callback.
 */
export interface SignatureProvider {
  createEnvelope(input: {
    mandateId: string;
    signerEmail: string;
    documentUrl: string;
  }): Promise<{ envelopeId: string; signingUrl: string }>;
}
