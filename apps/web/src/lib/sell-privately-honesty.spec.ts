/**
 * EC-S-34 — rendered /vendi-da-privato surface must stay honest in PONTE.
 * Work from keys (text-transform can uppercase labels in the DOM).
 */
import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import itMessages from '../../messages/it.json';
import {
  getSellPrivatelyBenefits,
  getSellPrivatelyLedger,
  getSellPrivatelySteps,
  showMediazioneBoundary,
  showMediazioneFallback,
  showSavingsFallback,
  showSavingsFigures,
} from './sell-privately';

const LOCALES = {
  it: itMessages as unknown as AbstractIntlMessages,
  en: enMessages as unknown as AbstractIntlMessages,
  es: esMessages as unknown as AbstractIntlMessages,
} as const;

const FORBIDDEN =
  /provvigione|commission|comisi[oó]n|percentuale|percentage|porcentaje|\b\d+\s*%|sanabilit|\+\s*\/\s*-\s*20|above\s+market|below\s+market|sopra\s+mercato|sotto\s+mercato|mundida|m\.?iva|p\.?\s*iva|s\.r\.l|titolare|controller/i;

function collectRenderedStrings(locale: keyof typeof LOCALES): string[] {
  const t = createTranslator({ locale, messages: LOCALES[locale], namespace: 'sellPrivately' });
  const ledger = getSellPrivatelyLedger();
  const out: string[] = [
    t('meta.title'),
    t('meta.description'),
    t('schema.serviceName'),
    t('schema.serviceType'),
    t('schema.offerDescription'),
    t('hero.title'),
    t('hero.lead'),
    t('hero.ctaPrimary'),
    t('hero.ctaSecondary'),
    t('intro.kicker'),
    t('intro.title'),
    t('intro.body'),
    t('intro.caption'),
    t('intro.videoAria'),
    t('intro.captionsLabel'),
    t('intro.transcriptToggle'),
    t('how.kicker'),
    t('how.title'),
    t('benefits.kicker'),
    t('benefits.title'),
    t('benefits.sub'),
    t('faq.kicker'),
    t('faq.title'),
    t('final.title'),
    t('final.body'),
    t('final.cta'),
    t('foot.privacyBefore'),
    t('foot.privacyLink'),
    t('foot.privacyAfter'),
    t('foot.myData'),
    t('foot.mediation'),
  ];
  for (const kw of t.raw('meta.keywords') as string[]) out.push(kw);
  for (const step of getSellPrivatelySteps(ledger)) {
    out.push(t(`how.steps.${step.id}.title`));
    out.push(t(`how.steps.${step.id}.body`));
  }
  for (const b of getSellPrivatelyBenefits(ledger)) {
    out.push(t(`benefits.items.${b.id}.title`));
    out.push(t(`benefits.items.${b.id}.body`));
  }
  for (const item of t.raw('faq.items') as Array<{ q: string; a: string }>) {
    out.push(item.q, item.a);
  }
  for (const line of t.raw('intro.transcript') as string[]) out.push(line);
  if (showSavingsFigures(ledger) || showSavingsFallback(ledger)) {
    out.push(t('savings.kicker'), t('savings.title'), t('savings.neutralTitle'), t('savings.neutralBody'));
  }
  if (showMediazioneBoundary(ledger) || showMediazioneFallback(ledger)) {
    out.push(t('not.title'), t('not.body'), t('not.fallbackTitle'), t('not.fallbackBody'));
  }
  return out;
}

describe('EC-S-34 sell-privately honesty', () => {
  it('does not render savings or mediazione blocks', () => {
    expect(showSavingsFigures()).toBe(false);
    expect(showSavingsFallback()).toBe(false);
    expect(showMediazioneBoundary()).toBe(false);
    expect(showMediazioneFallback()).toBe(false);
  });

  it('keeps the same sellPrivately keys in it/en/es', () => {
    const keys = (ns: unknown): string[] => {
      const walk = (value: unknown, prefix: string): string[] => {
        if (Array.isArray(value)) {
          return value.flatMap((item, i) => walk(item, `${prefix}[${i}]`));
        }
        if (value && typeof value === 'object') {
          return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
            walk(v, prefix ? `${prefix}.${k}` : k),
          );
        }
        return [prefix];
      };
      return walk(ns, '');
    };
    const itKeys = keys(itMessages.sellPrivately);
    expect(keys(enMessages.sellPrivately)).toEqual(itKeys);
    expect(keys(esMessages.sellPrivately)).toEqual(itKeys);
  });

  it.each(Object.keys(LOCALES) as Array<keyof typeof LOCALES>)(
    '%s rendered copy has no fee, market verdict, or legal-entity string',
    (locale) => {
      for (const text of collectRenderedStrings(locale)) {
        expect(text, text).not.toMatch(FORBIDDEN);
      }
    },
  );
});
