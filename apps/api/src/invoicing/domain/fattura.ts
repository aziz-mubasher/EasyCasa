/**
 * Fattura elettronica (FatturaPA) domain — pure.
 *
 * Verified against current (2026) Italian rules:
 *  - Format FatturaPA 1.2.2, transmitted via the Sistema di Interscambio (SdI).
 *  - Immediate invoice (TD01) must reach the SdI within 12 days of the operation
 *    date; for services the operation date is the payment date.
 *  - Imposta di bollo of €2 applies per document when the non-VAT amounts
 *    (esente / fuori campo / escluse) exceed €77.47.
 *
 * This builds and totals the validated payload; SdI transmission is a seam.
 */

export const IVA_STANDARD = 0.22;
const BOLLO_CENTS = 200; // €2,00
const BOLLO_THRESHOLD_CENTS = 7747; // €77,47

export type DocumentType = 'TD01'; // fattura immediata

export interface InvoiceParty {
  denominazione: string;
  partitaIva?: string;
  codiceFiscale?: string;
  /** SdI destination code (7 chars) or PEC; '0000000' for foreign/unknown. */
  codiceDestinatario?: string;
}

export interface InvoiceLineInput {
  description: string;
  imponibileCents: number;
  ivaRate: number; // 0.22, or 0 for non-VAT lines
  /** Natura code required when ivaRate is 0 (e.g. 'N2.2', 'N1'). */
  natura?: string;
}

export interface BuildInvoiceInput {
  cedente: InvoiceParty; // EasyCasa
  cessionario: InvoiceParty; // the client
  lines: InvoiceLineInput[];
  /** Operation date = payment date for services (ISO date). */
  operationDate: string;
  documentType?: DocumentType;
}

export interface InvoiceRiepilogo {
  ivaRate: number;
  imponibileCents: number;
  impostaCents: number;
  natura?: string;
}

export interface Invoice {
  format: 'FatturaPA 1.2.2';
  documentType: DocumentType;
  cedente: InvoiceParty;
  cessionario: InvoiceParty;
  operationDate: string;
  emissionDeadline: string;
  lines: InvoiceLineInput[];
  riepilogo: InvoiceRiepilogo[];
  imponibileTotalCents: number;
  impostaTotalCents: number;
  bolloCents: number;
  needsBollo: boolean;
  totaleDocumentoCents: number;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** SdI transmission deadline: 12 days from the operation date (immediate invoice). */
export function emissionDeadline(operationDate: string): string {
  return addDays(operationDate, 12);
}

export function buildInvoice(input: BuildInvoiceInput): Invoice {
  // Group lines into VAT riepilogo by (rate, natura).
  const groups = new Map<string, InvoiceRiepilogo>();
  for (const line of input.lines) {
    const key = `${line.ivaRate}|${line.natura ?? ''}`;
    const imposta = Math.round(line.imponibileCents * line.ivaRate);
    const existing = groups.get(key);
    if (existing) {
      existing.imponibileCents += line.imponibileCents;
      existing.impostaCents += imposta;
    } else {
      groups.set(key, {
        ivaRate: line.ivaRate,
        imponibileCents: line.imponibileCents,
        impostaCents: imposta,
        ...(line.natura ? { natura: line.natura } : {}),
      });
    }
  }
  const riepilogo = [...groups.values()];

  const imponibileTotalCents = riepilogo.reduce((s, r) => s + r.imponibileCents, 0);
  const impostaTotalCents = riepilogo.reduce((s, r) => s + r.impostaCents, 0);

  // Bollo: €2 when the sum of non-VAT imponibile exceeds €77.47.
  const nonVatCents = riepilogo
    .filter((r) => r.ivaRate === 0)
    .reduce((s, r) => s + r.imponibileCents, 0);
  const needsBollo = nonVatCents > BOLLO_THRESHOLD_CENTS;
  const bolloCents = needsBollo ? BOLLO_CENTS : 0;

  return {
    format: 'FatturaPA 1.2.2',
    documentType: input.documentType ?? 'TD01',
    cedente: input.cedente,
    cessionario: input.cessionario,
    operationDate: input.operationDate,
    emissionDeadline: emissionDeadline(input.operationDate),
    lines: input.lines,
    riepilogo,
    imponibileTotalCents,
    impostaTotalCents,
    bolloCents,
    needsBollo,
    // Bollo is a stamp duty, not part of the taxable base; it is added to the
    // document total the client pays.
    totaleDocumentoCents: imponibileTotalCents + impostaTotalCents + bolloCents,
  };
}
