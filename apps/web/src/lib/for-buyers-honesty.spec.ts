/**
 * EC-B-08 — /for-buyers honesty pass.
 * Keys must stay symmetric across it/en/es. Retracted fee / matching / GDPR
 * claims must not remain in the forBuyers namespace.
 * Dual-channel (private + agency) is the live buyer story — do not revert
 * the page to «privates only» or «agency vs EasyCasa».
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BUYER_INTRO_FRAME_FILES,
  BUYER_INTRO_FRAMES,
  buyerIntroFullscreenSrc,
} from '../components/services/buyer-intro-film';

const locales = ['it', 'en', 'es'] as const;
const root = join(dirname(fileURLToPath(import.meta.url)), '../../messages');
const publicFilm = join(dirname(fileURLToPath(import.meta.url)), '../../public/for-buyers/film');

type ForBuyers = {
  pillars: Array<{ idx: string; tag: 'live' | 'soon'; title: string; body: string }>;
  trust: { items: Array<{ title: string; body: string; tag?: 'live' | 'soon' }> };
  hero: Record<string, string>;
  how: { steps: Array<{ title: string; body: string }> };
  compare: { private: string; agency: string; rows: Array<{ label: string; private: string; agency: string }> };
  film: { scenes: Array<{ kicker: string; title: string; body: string }> };
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
      expect(
        fb.compare.rows.some((r) => /9\.150|€0/.test(`${r.label}${r.private}${r.agency}`)),
      ).toBe(false);
    }
  });

  it('tells buyers the OMI band is after sign-in', () => {
    for (const locale of locales) {
      const fb = load(locale).forBuyers;
      const omi = fb.pillars[0];
      expect(omi?.tag).toBe('live');
      const hay = `${omi?.body} ${fb.how.steps[1]?.body} ${fb.compare.rows.map((r) => `${r.private} ${r.agency}`).join(' ')} ${fb.film.scenes.map((s) => `${s.title} ${s.body}`).join(' ')}`;
      expect(hay.toLowerCase()).toMatch(/sign in|accedi|iniciar sesi[oó]n|dopo l|after you|tras iniciar/);
    }
  });

  it('describes both private sellers and agencies on the live path', () => {
    for (const locale of locales) {
      const fb = load(locale).forBuyers;
      const hay = `${fb.hero.lead} ${fb.hero.titleEm} ${fb.how.steps[0]?.body} ${fb.film.scenes.map((s) => s.body).join(' ')}`;
      expect(hay, locale).toMatch(/private|privato|privati|particular/i);
      expect(hay, locale).toMatch(/agency|agenzia|agenzie|agencia/i);
    }
  });

  it('compares private vs agency on EasyCasa, not agency vs the portal', () => {
    for (const locale of locales) {
      const fb = load(locale).forBuyers;
      expect(fb.compare).toHaveProperty('private');
      expect(fb.compare).toHaveProperty('agency');
      expect(fb.compare).not.toHaveProperty('easycasa');
      expect(fb.compare.rows).toHaveLength(4);
    }
  });

  it('ships an 8-scene intro film with frames on disk', () => {
    expect(BUYER_INTRO_FRAMES).toHaveLength(8);
    for (const locale of locales) {
      expect(load(locale).forBuyers.film.scenes).toHaveLength(8);
    }
    for (const file of BUYER_INTRO_FRAME_FILES) {
      expect(existsSync(join(publicFilm, file)), file).toBe(true);
    }
  });

  it('opens the 16:9 intro.html master in the locale of the page', () => {
    expect(buyerIntroFullscreenSrc('it')).toBe('/for-buyers/film/intro.html?lang=it&record=1');
    expect(buyerIntroFullscreenSrc('en')).toBe('/for-buyers/film/intro.html?lang=en&record=1');
    expect(buyerIntroFullscreenSrc('es')).toBe('/for-buyers/film/intro.html?lang=es&record=1');
    expect(buyerIntroFullscreenSrc('de')).toBe('/for-buyers/film/intro.html?lang=it&record=1');
    for (const locale of locales) {
      const film = load(locale).forBuyers.film as { fullscreen: string; closeFullscreen: string };
      expect(film.fullscreen.length).toBeGreaterThan(0);
      expect(film.closeFullscreen.length).toBeGreaterThan(0);
    }
  });
});
