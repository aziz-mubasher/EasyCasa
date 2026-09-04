import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const locales = ['it', 'en', 'es'] as const;
const pages = ['home', 'search', 'add', 'pricing'] as const;
const root = join(dirname(fileURLToPath(import.meta.url)), '../../messages');

function load(locale: (typeof locales)[number]) {
  return JSON.parse(readFileSync(join(root, `${locale}.json`), 'utf8')) as {
    meta: {
      template: string;
      home: { title: string; description: string };
      search: { title: string; description: string };
      add: { title: string; description: string };
      pricing: { title: string; description: string };
      notFound: { title: string };
    };
  };
}

describe('meta namespace', () => {
  it('exists in every locale with distinct page titles', () => {
    for (const locale of locales) {
      const { meta } = load(locale);
      expect(meta.template).toBe('%s · EasyCasa');
      expect(meta.notFound.title.length).toBeGreaterThan(0);
      const titles = pages.map((p) => meta[p].title);
      expect(new Set(titles).size).toBe(titles.length);
      for (const page of pages) {
        expect(meta[page].title.length).toBeGreaterThan(0);
        expect(meta[page].title.length).toBeLessThanOrEqual(60);
        expect(meta[page].description.length).toBeGreaterThanOrEqual(110);
        expect(meta[page].description.length).toBeLessThanOrEqual(160);
      }
    }
  });

  it('does not ship banned legal tokens', () => {
    const banned = /sanabilit[àa]|provvigione\s+\d|%\s*(del|sul)\s+(prezzo|valore)\s+di\s+vendita/i;
    for (const locale of locales) {
      const blob = JSON.stringify(load(locale).meta);
      expect(blob).not.toMatch(banned);
    }
  });
});
