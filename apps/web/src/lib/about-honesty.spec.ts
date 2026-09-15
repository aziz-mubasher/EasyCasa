/**
 * /about honesty pass (15 Sep 2026).
 * C1/G1: no both-sides no-commission headline.
 * C2: no identity-verified-before-publish card.
 * C4/G4: no “deal directly” until routeLead is off.
 * Card 01 is a marked hole (EC-S-36), not a replacement claim.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const locales = ['it', 'en', 'es'] as const;
const root = join(dirname(fileURLToPath(import.meta.url)), '../../messages');

type AboutUs = {
  meta: { title: string; description: string };
  hero: { kicker: string; title: string; lede: string; status: string; close: string };
  how: { title: string };
  pillars: Array<{ num: string; title: string; body: string }>;
  explore: { title: string; cols: Array<{ title: string; links: Array<{ label: string; href: string }> }> };
  groupNote: string;
  contact: { title: string; body: string; emailLabel: string; formLabel: string; formValue: string };
  langsNote: string;
};

function load(locale: (typeof locales)[number]) {
  return JSON.parse(readFileSync(join(root, `${locale}.json`), 'utf8')) as { aboutUs: AboutUs };
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

const bannedHeadline =
  /Direct buying and selling, with no commission|Compravendita diretta, senza commissioni|Compraventa directa, sin comisiones|no commission from us|almost no commission|quasi nessun/i;

const bannedVerify =
  /identity-verified|identità verificata|identidad verificada|before a listing goes live|prima che l.annuncio vada online|antes de que el anuncio|not after something goes wrong|non dopo che qualcosa|no después de que algo/i;

const bannedDirect =
  /deal with each other directly|trattare direttamente|tratar directamente|we do not sit in between|non stiamo in mezzo/i;

const bannedEnergyGate =
  /cannot go live without (its )?energy|non può andare online senza|no puede publicarse sin/i;

describe('aboutUs honesty (15 Sep)', () => {
  it('keeps the same leaf keys in it/en/es', () => {
    const [it, en, es] = locales.map((l) => leafKeys(load(l).aboutUs).sort());
    expect(it).toEqual(en);
    expect(es).toEqual(en);
  });

  it('ships three cards (OMI, seller-side fixed prices, agencies) and no verify card', () => {
    for (const locale of locales) {
      const { pillars } = load(locale).aboutUs;
      expect(pillars).toHaveLength(3);
      expect(pillars.map((p) => p.num)).toEqual(['01', '02', '03']);
      expect(pillars[0]?.body).toMatch(/OMI/);
      expect(pillars[1]?.body.toLowerCase()).toMatch(/seller|chi vende|el vendedor/);
      expect(pillars[2]?.body.toLowerCase()).toMatch(/agency|agenzia|agencia/);
    }
  });

  it('states PONTE and the appalto line; close is paid-on-delivery', () => {
    for (const locale of locales) {
      const { hero } = load(locale).aboutUs;
      expect(hero.status).toMatch(/agente d.affari in mediazione|mediación inmobiliaria/i);
      expect(hero.lede.toLowerCase()).toMatch(/fixed sum|somma fissa|suma fija/);
      expect(hero.close.toLowerCase()).toMatch(/on delivery|alla consegna|a la entrega/);
    }
  });

  it('does not ship retracted headline, verify, direct-deal, or energy-gate claims', () => {
    for (const locale of locales) {
      const blob = JSON.stringify(load(locale).aboutUs);
      expect(blob, locale).not.toMatch(bannedHeadline);
      expect(blob, locale).not.toMatch(bannedVerify);
      expect(blob, locale).not.toMatch(bannedDirect);
      expect(blob, locale).not.toMatch(bannedEnergyGate);
    }
  });

  it('indexes agencies and does not point OMI at the free-valuation slug', () => {
    for (const locale of locales) {
      const cols = load(locale).aboutUs.explore.cols;
      expect(cols).toHaveLength(4);
      const hrefs = cols.flatMap((c) => c.links.map((l) => l.href));
      expect(hrefs).toContain('/agenzie');
      expect(hrefs).not.toContain('/valutazione-gratuita');
      const omi = cols
        .flatMap((c) => c.links)
        .find((l) => /OMI|mercato|mercado/i.test(l.label));
      expect(omi?.href).toBe('/for-buyers');
    }
  });

  it('names Easy Legenda and NIB so the page matches the footer stakeholders', () => {
    for (const locale of locales) {
      const note = load(locale).aboutUs.groupNote;
      expect(note).toMatch(/Easy Legenda/);
      expect(note).toMatch(/NIB/);
    }
  });
});
