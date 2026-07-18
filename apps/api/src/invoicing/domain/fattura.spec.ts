import { describe, expect, it } from 'vitest';

import { buildInvoice, emissionDeadline, type BuildInvoiceInput } from './fattura';

const cedente = { denominazione: 'EasyCasa Srl', partitaIva: 'IT01234567890' };
const cessionario = { denominazione: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01F205X' };

function input(over: Partial<BuildInvoiceInput> = {}): BuildInvoiceInput {
  return {
    cedente,
    cessionario,
    operationDate: '2026-09-01',
    lines: [{ description: 'Document check', imponibileCents: 10_000, ivaRate: 0.22 }],
    ...over,
  };
}

describe('buildInvoice', () => {
  it('standard 22% invoice: imposta and totals', () => {
    const inv = buildInvoice(input());
    expect(inv.imponibileTotalCents).toBe(10_000);
    expect(inv.impostaTotalCents).toBe(2_200);
    expect(inv.totaleDocumentoCents).toBe(12_200);
    expect(inv.needsBollo).toBe(false);
    expect(inv.format).toBe('FatturaPA 1.2.2');
    expect(inv.documentType).toBe('TD01');
  });

  it('multi-rate invoice builds a riepilogo per rate', () => {
    const inv = buildInvoice(
      input({
        lines: [
          { description: 'Fee A', imponibileCents: 10_000, ivaRate: 0.22 },
          { description: 'Fee B', imponibileCents: 5_000, ivaRate: 0.22 },
          { description: 'Exempt passthrough', imponibileCents: 3_000, ivaRate: 0, natura: 'N2.2' },
        ],
      }),
    );
    expect(inv.riepilogo.length).toBe(2);
    const vat = inv.riepilogo.find((r) => r.ivaRate === 0.22);
    expect(vat?.imponibileCents).toBe(15_000);
    expect(vat?.impostaCents).toBe(3_300);
    const exempt = inv.riepilogo.find((r) => r.ivaRate === 0);
    expect(exempt?.natura).toBe('N2.2');
  });

  it('bollo €2 applies when non-VAT amount exceeds €77.47', () => {
    const inv = buildInvoice(
      input({ lines: [{ description: 'Exempt', imponibileCents: 8_000, ivaRate: 0, natura: 'N1' }] }),
    );
    expect(inv.needsBollo).toBe(true);
    expect(inv.bolloCents).toBe(200);
    expect(inv.totaleDocumentoCents).toBe(8_000 + 200);
  });

  it('no bollo when non-VAT amount is at/below €77.47', () => {
    const inv = buildInvoice(
      input({ lines: [{ description: 'Exempt', imponibileCents: 7_747, ivaRate: 0, natura: 'N1' }] }),
    );
    expect(inv.needsBollo).toBe(false);
    expect(inv.bolloCents).toBe(0);
  });

  it('VAT lines never trigger bollo regardless of size', () => {
    const inv = buildInvoice(
      input({ lines: [{ description: 'Big fee', imponibileCents: 1_000_000, ivaRate: 0.22 }] }),
    );
    expect(inv.needsBollo).toBe(false);
  });

  it('emission deadline is 12 days from the operation date', () => {
    expect(emissionDeadline('2026-09-01')).toBe('2026-09-13');
    expect(buildInvoice(input()).emissionDeadline).toBe('2026-09-13');
  });
});
