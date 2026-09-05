import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  WA_OPERATOR_LOCALES,
  WA_OPERATOR_TEMPLATES,
  parseWaOperatorLocale,
  waOperatorTemplateBody,
  waOperatorTextDirection,
} from '@easycasa/shared';

const DOCK = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'WhatsAppOperatorDock.tsx'),
  'utf8',
);

describe('WhatsApp operator templates', () => {
  it('covers the five desk languages', () => {
    expect([...WA_OPERATOR_LOCALES]).toEqual(['it', 'en', 'es', 'ur', 'hi']);
    expect(parseWaOperatorLocale('ur')).toBe('ur');
    expect(parseWaOperatorLocale('hi')).toBe('hi');
    expect(parseWaOperatorLocale('pt')).toBe('es');
    expect(waOperatorTextDirection('ur')).toBe('rtl');
    expect(waOperatorTextDirection('hi')).toBe('ltr');
  });

  it('has a body in every locale and stays T04-safe', () => {
    const banned = /proposta|caparra|provvigione|sanabilit|mutuo|credit advisor|% of sale/i;
    for (const tpl of WA_OPERATOR_TEMPLATES) {
      for (const locale of WA_OPERATOR_LOCALES) {
        expect(tpl.title[locale].trim().length).toBeGreaterThan(0);
        expect(tpl.body[locale].trim().length).toBeGreaterThan(8);
        expect(tpl.body[locale]).not.toMatch(banned);
      }
    }
    expect(waOperatorTemplateBody('call', 'en')).toContain('/en/prenota-chiamata');
    expect(waOperatorTemplateBody('call', 'ur')).toContain('/ur/prenota-chiamata');
    expect(waOperatorTemplateBody('call', 'hi')).toContain('/hi/prenota-chiamata');
    expect(waOperatorTemplateBody('call', 'ur')).toContain(
      'اپنی زبان میں ہمارے ساتھ 15 منٹ کی دریافت کال بک کریں',
    );
    expect(waOperatorTemplateBody('call', 'ur')).toContain('Salam o alaikum, name');
    expect(waOperatorTemplateBody('legenda', 'it')).toContain('legenda.easycasaita.com');
  });

  it('dock can insert and one-tap send', () => {
    expect(DOCK).toContain('ecwa__dock');
    expect(DOCK).toContain('Send ${title}');
    expect(DOCK).toContain('onInsert');
  });
});
