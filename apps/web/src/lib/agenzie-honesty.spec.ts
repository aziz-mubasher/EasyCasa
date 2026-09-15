/**
 * /agenzie honesty pass — 15 Sep.
 * Retracted budget / Banks4All / person-filter claims must not return.
 * The four §3 promises stay labelled coming until evidence flips them.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { visibleAgencyPromises } from './agenzie';

const locales = ['it', 'en', 'es'] as const;
const root = join(dirname(fileURLToPath(import.meta.url)), '../../messages');

type Benefit = { id: string; num: string; title: string; body: string };
type Honest = { title: string; body: string };
type Agenzie = {
  meta: { title: string; description: string };
  tags: { live: string; coming: string };
  hero: { lead: string; pills: string[] };
  benefits: { items: Benefit[] };
  rules: { items: string[] };
  claims: { items: Record<string, { title: string; body: string }> };
  honest: { items: Honest[] };
  form: { counterpart: string };
};

function load(locale: (typeof locales)[number]) {
  return JSON.parse(readFileSync(join(root, `${locale}.json`), 'utf8')) as {
    agenzie: Agenzie;
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

const bannedBudget =
  /verified budget|budget verificat|presupuesto verificad|budget band|fascia di budget|franja de presupuesto|financial-capacity|capacit[aà] finanziaria|capacidad financiera|show homes only|fai visite solo con chi|haz visitas solo con quien|banks4all|status, band|solo stato, fascia|solo estado, franja/i;

const bannedClientOwnership = /EasyCasa client|clienti EasyCasa|clientes EasyCasa/;

describe('agenzie honesty (15 Sep)', () => {
  it('keeps the same leaf keys in it/en/es', () => {
    const [it, en, es] = locales.map((l) => leafKeys(load(l).agenzie).sort());
    expect(it).toEqual(en);
    expect(es).toEqual(en);
  });

  it('does not ship the retracted budget / Banks4All / person-filter block', () => {
    for (const locale of locales) {
      const blob = JSON.stringify(load(locale).agenzie);
      expect(blob, locale).not.toMatch(bannedBudget);
    }
  });

  it('does not call the buyer an EasyCasa client', () => {
    for (const locale of locales) {
      const blob = JSON.stringify(load(locale).agenzie);
      expect(blob, locale).not.toMatch(bannedClientOwnership);
    }
  });

  it('makes never-per-contact the third advantage and the third straight-talk point', () => {
    for (const locale of locales) {
      const page = load(locale).agenzie;
      expect(page.benefits.items).toHaveLength(6);
      expect(page.benefits.items[2]?.id).toBe('noPerContact');
      expect(page.benefits.items[2]?.body.toLowerCase()).toMatch(
        /never charge|mai pagare|nunca os cobraremos|nunca cobraremos/,
      );
      expect(page.honest.items).toHaveLength(3);
      expect(page.honest.items[2]?.body.toLowerCase()).toMatch(
        /flat fee|canone fisso|cuota fija/,
      );
      expect(page.hero.pills.some((p) => /never|mai|nunca/i.test(p))).toBe(true);
    }
  });

  it('names Mundida as the contracting party', () => {
    for (const locale of locales) {
      const page = load(locale).agenzie;
      expect(page.form.counterpart).toMatch(/Mundida/);
      expect(page.form.counterpart).toMatch(/04531990986/);
      expect(page.honest.items[1]?.body).toMatch(/Mundida/);
    }
  });

  it('labels the four §3 promises as coming', () => {
    const visible = visibleAgencyPromises();
    expect(visible.map((e) => e.id)).toEqual(['A1', 'A2', 'A3', 'A4']);
    expect(visible.every((e) => e.status === 'coming')).toBe(true);
    for (const locale of locales) {
      const items = load(locale).agenzie.claims.items;
      expect(Object.keys(items).sort()).toEqual(['A1', 'A2', 'A3', 'A4']);
    }
  });

  it('does not claim every listing is verified in the hero', () => {
    for (const locale of locales) {
      const lead = load(locale).agenzie.hero.lead.toLowerCase();
      expect(lead).not.toMatch(/every listing is verified|ogni annuncio è verificato|cada anuncio está verificado/);
    }
  });
});
