/**
 * EC-B-08 — /for-buyers honesty pass.
 * Keys must stay symmetric across it/en/es. Retracted fee / matching / GDPR
 * claims must not remain in the forBuyers namespace.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const locales = ['it', 'en', 'es'] as const;
const root = join(dirname(fileURLToPath(import.meta.url)), '../../messages');

type ForBuyers = {
  pillars: Array<{ idx: string; tag: 'live' | 'soon'; title: string; body: string }>;
  trust: { items: Array<{ title: string; body: string; tag?: 'live' | 'soon' }> };
  hero: Record<string, string>;
  how: { steps: Array<{ title: string; body: string }> };
  compare: { rows: Array<{ label: string; agency: string; easycasa: string }> };
};

function load(locale: (typeof locales)[number]) {
  return JSON.parse(readFileSync(join(root, `${locale}.json`), 'utf8')) as {
    forBuyers: ForBuyers;
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

/** Source-key scan — CSS text-transform must not be the test surface. */
const banned =
  /commission|commissione|comisi[oó]n|provvigione|honorario|buyer-side fee|%\s*\+|€\s*9[.\s]?150|answered first|risponde prima|respuesta primero|before they can publish|prima di pubblicare|antes de publicar|posing as|si fingono|se hacen pasar|your data books|i tuoi dati servono|tus datos reservan|bait pricing|prezzi esca|precio cebo|zero buyer|zero commissione|cero comisi/i;

describe('forBuyers honesty (EC-B-08)', () => {
  it('keeps the same leaf keys in it/en/es', () => {
    const [it, en, es] = locales.map((l) => leafKeys(load(l).forBuyers).sort());
    expect(it).toEqual(en);
    expect(es).toEqual(en);
  });

  it('does not ship retracted fee, matching, or controller-naming claims', () => {
    for (const locale of locales) {
      const blob = JSON.stringify(load(locale).forBuyers);
      expect(blob, locale).not.toMatch(banned);
    }
  });

  it('renders three pillars: OMI live, viewings live, badge still soon', () => {
    for (const locale of locales) {
      const { pillars } = load(locale).forBuyers;
      expect(pillars).toHaveLength(3);
      expect(pillars.map((p) => p.tag)).toEqual(['live', 'live', 'soon']);
      expect(pillars[2]?.title).toMatch(/Verified Buyer Badge/);
    }
  });

  it('scopes VO to the badge and tags only 05e + one-tap as soon', () => {
    for (const locale of locales) {
      const items = load(locale).forBuyers.trust.items;
      expect(items).toHaveLength(3);
      expect(items[0]?.tag).toBeUndefined();
      expect(items[1]?.tag).toBe('soon');
      expect(items[2]?.tag).toBe('soon');
    }
  });

  it('has no hero savings figure and no compare fee row', () => {
    for (const locale of locales) {
      const fb = load(locale).forBuyers;
      expect(fb.hero).not.toHaveProperty('figure');
      expect(fb.hero).not.toHaveProperty('figureLabel');
      expect(fb.compare.rows.some((r) => /9\.150|€0/.test(`${r.label}${r.agency}${r.easycasa}`))).toBe(
        false,
      );
    }
  });

  it('tells buyers the OMI band is after sign-in', () => {
    for (const locale of locales) {
      const fb = load(locale).forBuyers;
      const omi = fb.pillars[0];
      expect(omi?.tag).toBe('live');
      const hay = `${omi?.body} ${fb.how.steps[1]?.body} ${fb.compare.rows.map((r) => r.easycasa).join(' ')}`;
      expect(hay.toLowerCase()).toMatch(/sign in|accedi|iniciar sesi[oó]n|dopo l|after you|tras iniciar/);
    }
  });
});
