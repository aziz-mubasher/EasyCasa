/**
 * /transparency honesty pass (15 Sep 2026).
 * T1: name inactive 2.49% SKUs — do not say “ever, in any form”.
 * T2: distinguish booking vs accompaniment; name offer drafting.
 * T4: source and semester, not “the calculation”.
 * T5: product + hole + Mundida licence; name Credit Prime.
 * Item 05: featured/boost is labelled; do not deny paid ranking.
 * PERIMETER substitute until EC-AYNI-1: this spec + catalog.ts active flags.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const locales = ['it', 'en', 'es'] as const;
const webRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const messagesRoot = join(webRoot, 'messages');
const repoRoot = join(webRoot, '../..');

type Transparency = {
  lastUpdated: string;
  sub: string;
  model: {
    ponte: string;
    stateBound: string;
    pillars: Array<{ tag: string; title: string; paras: string[] }>;
  };
  pay: { lede: string; rows: Array<{ who: string; amt: string }>; note: string };
  rules: { items: Array<{ title: string; body: string }> };
  sources: { note: string };
  banks: { lede: string; items: string[] };
  consumer: { withdrawal: string; earlyStart: string; odrLink: string };
  ident: Record<string, string>;
};

function load(locale: (typeof locales)[number]) {
  return JSON.parse(readFileSync(join(messagesRoot, `${locale}.json`), 'utf8')) as {
    transparencyPage: Transparency;
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

const bannedAbsolute =
  /Ever, in any form|Mai, in nessuna forma|Nunca, de ninguna forma|will stay free|non costerà nulla|no costará nada|show you the calculation|ti mostriamo il calcolo|te mostramos el cálculo|Nobody can pay to rank higher|Nessuno può pagare per comparire più in alto|Nadie puede pagar por aparecer más arriba|in the Mundida group|del gruppo Mundida|del grupo Mundida/i;

const bannedUnsourcedCount = /7[.,]866/;

describe('transparencyPage honesty (15 Sep)', () => {
  it('keeps the same leaf keys in it/en/es', () => {
    const [it, en, es] = locales.map((l) => leafKeys(load(l).transparencyPage).sort());
    expect(it).toEqual(en);
    expect(es).toEqual(en);
  });

  it('dates the page as PONTE with a product-owner reviewer, not counsel', () => {
    for (const locale of locales) {
      const { lastUpdated, model } = load(locale).transparencyPage;
      expect(lastUpdated).toMatch(/PONTE/);
      expect(lastUpdated).toMatch(/AZM/);
      expect(lastUpdated.toLowerCase()).toMatch(/not counsel|non counsel|no counsel/);
      expect(model.ponte).toMatch(/mediazion|mediaci[oó]n/i);
      expect(model.stateBound).toMatch(/PONTE/);
    }
  });

  it('discloses the inactive 2.49% SKUs and does not use the G1 absolute', () => {
    for (const locale of locales) {
      const page = load(locale).transparencyPage;
      const blob = JSON.stringify(page);
      expect(blob, locale).not.toMatch(bannedAbsolute);
      expect(page.model.pillars[0]?.paras.join(' ')).toMatch(/2[.,]49/);
      expect(page.ident.placeholder).toMatch(/denominazione/);
    }
  });

  it('names accompaniment, offer drafting, Credit Prime, withdrawal and ODR', () => {
    for (const locale of locales) {
      const page = load(locale).transparencyPage;
      const blob = JSON.stringify(page);
      expect(blob, locale).toMatch(/€49|49/);
      expect(blob, locale).toMatch(/€99|99/);
      expect(blob, locale).toMatch(/Credit Prime/);
      expect(page.consumer.withdrawal).toMatch(/art\.\s*52/);
      expect(page.consumer.earlyStart).toMatch(/art\.\s*59/);
      expect(page.consumer.odrLink).toMatch(/consumers\/odr/);
      expect(page.pay.note).toMatch(/avvocat|lawyer|abogad/i);
      expect(page.pay.rows.some((r) => /pilot|pilota|piloto/i.test(r.who))).toBe(true);
    }
  });

  it('rewrites item 01 to source and semester and item 05 to labelled featured', () => {
    for (const locale of locales) {
      const { rules, sources } = load(locale).transparencyPage;
      expect(rules.items[0]?.body).toMatch(/source and the semester|fonte e il semestre|fuente y el semestre/i);
      expect(rules.items[4]?.body.toLowerCase()).toMatch(/featured|evidenza|destacad|boost/);
      expect(sources.note).not.toMatch(bannedUnsourcedCount);
      expect(sources.note).toMatch(/H2 2025/);
    }
  });

  it('does not describe EasyCasa as a Mundida-group sibling of Banks4All', () => {
    for (const locale of locales) {
      const { banks, ident } = load(locale).transparencyPage;
      expect(`${banks.lede} ${ident.banks}`).not.toMatch(/Mundida group|gruppo Mundida|grupo Mundida/i);
      expect(banks.lede).toMatch(/product|prodotto|producto/i);
      expect(ident.banks).toMatch(/Credit Prime/);
    }
  });

  it('keeps limits length and the honest-list line', () => {
    for (const locale of locales) {
      const limits = JSON.parse(readFileSync(join(messagesRoot, `${locale}.json`), 'utf8')) as {
        transparencyPage: { limits: { lede: string; items: string[] } };
      };
      expect(limits.transparencyPage.limits.items).toHaveLength(5);
      expect(limits.transparencyPage.limits.lede.toLowerCase()).toMatch(
        /honest list|elenco onesto|lista honesta/,
      );
    }
  });

  it('PERIMETER substitute: public catalog has no active provvigione; routeLead is PONTE-gated', () => {
    const catalog = readFileSync(
      join(repoRoot, 'apps/api/src/service-catalog/domain/catalog.ts'),
      'utf8',
    );
    expect(catalog).toMatch(/priceModel: 'provvigione'/);
    expect(catalog).toMatch(/active: false/);
    expect(catalog).toMatch(/listPublicCatalogItems/);
    expect(catalog).toMatch(/isPonte\(\) && item\.priceModel === 'provvigione'/);

    const partners = readFileSync(join(repoRoot, 'apps/api/src/partners/partners.service.ts'), 'utf8');
    expect(partners).toMatch(/if \(isPonte\(\)\)/);
    expect(partners).toMatch(/routeLead skipped in PONTE/);
  });
});
