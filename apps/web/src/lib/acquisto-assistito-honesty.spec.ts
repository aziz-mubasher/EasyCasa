/**
 * /acquisto-assistito honesty pass (15 Sep 2026).
 * Ships now: withdrawal + spec table + pricing identity footer.
 * Does not rewrite steps 03/04 or drop OFFER_DRAFTING (counsel on §A1).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const locales = ['it', 'en', 'es'] as const;
const root = join(dirname(fileURLToPath(import.meta.url)), '../../messages');

type Acquisto = {
  scheda: { seal: string; rows: Array<{ dt: string; dd: string }> };
  traps: Array<{ term: string; body: string }>;
  steps: Array<{ no: string; what: string; when: string }>;
  terms: { kicker: string; title: string; lede: string };
  consumer: { withdrawal: string; earlyStart: string; precontract: string; odrLink: string };
  footer: { entity: string; placeholder: string; enrollment: string };
  faq: Array<{ q: string; a: string }>;
};

function load(locale: (typeof locales)[number]) {
  return JSON.parse(readFileSync(join(root, `${locale}.json`), 'utf8')) as {
    acquistoAssistito: Acquisto;
  };
}

function leafKeys(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => leafKeys(item, `${prefix}[${i}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      leafKeys(v, prefix ? `${prefix}.${k}` : k),
    );
  }
  return [prefix];
}

const bannedCompare =
  /€10[.,]?980|€1[.,]?818|Customary agency rate|Uso di agenzia|Uso de agencia|charged the same again|lo stesso sull.operazione|lo mismo en la misma operación/i;

const bannedPiva = /EasyCasa Italia\s*·\s*P\.IVA\s*IT04531990986|Easy Casa Italia\s*·\s*P\.IVA\s*IT04531990986/i;

const bannedMediationMandate = /mediation mandate|mandato di mediazione|mandato de mediaci[oó]n|art\.\s*6,\s*L\.\s*39/i;

describe('acquistoAssistito honesty (15 Sep)', () => {
  it('keeps the same leaf keys in it/en/es', () => {
    const [it, en, es] = locales.map((l) => leafKeys(load(l).acquistoAssistito).sort());
    expect(it).toEqual(en);
    expect(es).toEqual(en);
  });

  it('replaces the agency comparison with the spec table and names art. 1655', () => {
    for (const locale of locales) {
      const aa = load(locale).acquistoAssistito;
      expect(aa).not.toHaveProperty('compare');
      expect(aa).not.toHaveProperty('commission');
      expect(aa.terms.title.length).toBeGreaterThan(8);
      expect(aa.scheda.rows.some((r) => r.dd === '€0' || r.dd === '0')).toBe(true);
      expect(aa.scheda.rows.some((r) => /1[.,]?490/.test(r.dd))).toBe(true);
      expect(aa.scheda.seal).toMatch(/1655/);
      expect(JSON.stringify(aa), locale).not.toMatch(bannedCompare);
      expect(aa.scheda.seal, locale).not.toMatch(bannedMediationMandate);
    }
  });

  it('states art. 52 / 59 withdrawal and the ODR link', () => {
    for (const locale of locales) {
      const { consumer } = load(locale).acquistoAssistito;
      expect(consumer.withdrawal).toMatch(/art\.\s*52/);
      expect(consumer.earlyStart).toMatch(/art\.\s*59/);
      expect(consumer.precontract).toMatch(/art\.\s*49/);
      expect(consumer.odrLink).toMatch(/consumers\/odr/);
    }
  });

  it('uses the pricing identity hole and does not wear Mundida’s P.IVA', () => {
    for (const locale of locales) {
      const { footer } = load(locale).acquistoAssistito;
      expect(footer.placeholder).toMatch(/denominazione/);
      expect(footer.enrollment.toLowerCase()).toMatch(/mediazion|mediation|mediaci[oó]n/);
      expect(JSON.stringify(footer), locale).not.toMatch(bannedPiva);
    }
  });

  it('labels durations as typical and leaves steps 03/04 wording to counsel', () => {
    for (const locale of locales) {
      const { steps, traps } = load(locale).acquistoAssistito;
      expect(steps).toHaveLength(7);
      expect(steps.every((s) => /typical|di solito|suele/i.test(s.when))).toBe(true);
      expect(steps[2]?.what.toLowerCase()).toMatch(/draft|redatt|redact/);
      const cat = traps.find((t) => t.term.startsWith('Conform'));
      expect(cat?.body).toMatch(/29/);
    }
  });

  it('keeps the 3% fact and drops liberalisation / competitor-cost framing', () => {
    for (const locale of locales) {
      const faq = load(locale).acquistoAssistito.faq;
      const three = faq.find((f) => f.q.includes('3%'));
      expect(three?.a).toMatch(/6/);
      expect(three?.a, locale).not.toMatch(/liberalis|liberaliz/i);
    }
  });
});
