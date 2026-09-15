/**
 * EC-SELL-PRIVATELY-1 — rendered /vendi-da-privato surface.
 * Work from keys (text-transform can uppercase labels in the DOM).
 */
import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import itMessages from '../../messages/it.json';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SELLER_INTRO_FRAME_FILES,
  SELLER_INTRO_FRAMES,
  sellerIntroFullscreenSrc,
} from '../components/services/seller-intro-film';
import {
  getSellPrivatelyBenefits,
  getSellPrivatelyLedger,
  getSellPrivatelySteps,
  showBuyerPreapprovalComing,
  showEnergyRequiredLive,
  showMediazioneBoundary,
  showMediazioneFallback,
  showSavingsFallback,
  showSavingsFigures,
} from './sell-privately';

const publicFilm = join(dirname(fileURLToPath(import.meta.url)), '../../public/vendi-da-privato/film');

const LOCALES = {
  it: itMessages as unknown as AbstractIntlMessages,
  en: enMessages as unknown as AbstractIntlMessages,
  es: esMessages as unknown as AbstractIntlMessages,
} as const;

const FORBIDDEN_ON_PAGE =
  /verified buyer|financial badge|banks4all|acquirente verificato|distintivo financiero|comprador verificado|badge finanziario/i;

const PERSON_LABEL =
  /\b(verificato|qualificato|affidabile|verified|qualified|reliable|verificado|cualificado|fiable)\b/i;

function collectRenderedStrings(locale: keyof typeof LOCALES): string[] {
  const t = createTranslator({ locale, messages: LOCALES[locale], namespace: 'sellPrivately' });
  const ledger = getSellPrivatelyLedger();
  const out: string[] = [
    t('meta.title'),
    t('meta.description'),
    t('schema.serviceName'),
    t('schema.serviceType'),
    t('schema.offerDescription'),
    t('hero.kicker'),
    t('hero.title'),
    t('hero.lead'),
    t('hero.ctaPrimary'),
    t('hero.ctaSecondary'),
    t('hero.ctaFilm'),
    t('hero.freeAlways'),
    t('film.kicker'),
    t('film.title'),
    t('film.play'),
    t('film.pause'),
    t('film.replay'),
    t('film.skip'),
    t('film.fullscreen'),
    t('film.closeFullscreen'),
    t('film.iframeTitle'),
    t('how.kicker'),
    t('how.title'),
    t('how.sub'),
    t('never.kicker'),
    t('never.title'),
    t('costs.title'),
    t('costs.sub'),
    t('agency.title'),
    t('agency.body'),
    t('faq.title'),
    t('final.title'),
    t('final.body'),
    t('final.cta'),
    t('foot.notEnrolled'),
    t('foot.mediation'),
    t('foot.privacyBefore'),
    t('foot.privacyLink'),
    t('foot.myData'),
  ];
  for (const item of t.raw('money.items') as Array<{ figure: string; title: string; body: string }>) {
    out.push(item.figure, item.title, item.body);
  }
  for (const item of t.raw('split.youItems') as Array<{ text: string }>) out.push(item.text);
  for (const item of t.raw('split.weItems') as Array<{ text: string }>) out.push(item.text);
  for (const item of t.raw('never.items') as Array<{ title: string; body: string }>) {
    out.push(item.title, item.body);
  }
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
  for (const scene of t.raw('film.scenes') as Array<{ kicker: string; title: string; body: string }>) {
    out.push(scene.kicker, scene.title, scene.body);
  }
  if (showEnergyRequiredLive(ledger)) {
    out.push(t('ape.title'), t('ape.body'), t('ape.cite'));
    for (const item of t.raw('ape.pairs') as Array<{ title: string; body: string }>) {
      out.push(item.title, item.body);
    }
  }
  if (showBuyerPreapprovalComing(ledger)) {
    out.push(t('ready.title'), t('ready.bodyComing'), t('ready.footComing'));
  }
  if (showSavingsFigures(ledger) || showSavingsFallback(ledger)) {
    out.push(t('savings.kicker'), t('savings.title'), t('savings.neutralTitle'), t('savings.neutralBody'));
  }
  if (showMediazioneBoundary(ledger) || showMediazioneFallback(ledger)) {
    out.push(t('not.title'), t('not.body'), t('not.fallbackTitle'), t('not.fallbackBody'));
  }
  return out;
}

describe('EC-SELL-PRIVATELY-1 sell-privately honesty', () => {
  it('does not render savings or legacy mediazione counsel blocks', () => {
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
    '%s sellPrivately namespace has no Verified Buyer / financial badge / Banks4All',
    (locale) => {
      const blob = JSON.stringify((LOCALES[locale] as { sellPrivately: unknown }).sellPrivately);
      expect(blob, locale).not.toMatch(FORBIDDEN_ON_PAGE);
      expect((LOCALES[locale] as { sellPrivately: { meta?: { keywords?: unknown } } }).sellPrivately.meta?.keywords).toBeUndefined();
    },
  );

  it.each(Object.keys(LOCALES) as Array<keyof typeof LOCALES>)(
    '%s rendered copy has no person-merit label and no retracted P4',
    (locale) => {
      const rendered = collectRenderedStrings(locale);
      const blob = rendered.join('\n');
      expect(blob, locale).not.toMatch(FORBIDDEN_ON_PAGE);
      expect(blob.toLowerCase()).not.toMatch(/p4/);
      for (const text of rendered) {
        if (PERSON_LABEL.test(text) && /buyer|acquirent|comprador|persona|person|human/i.test(text)) {
          throw new Error(`person-merit label in: ${text}`);
        }
      }
    },
  );

  it('ships the non-enrolment sentence in the footer in it/en/es', () => {
    for (const locale of Object.keys(LOCALES) as Array<keyof typeof LOCALES>) {
      const t = createTranslator({ locale, messages: LOCALES[locale], namespace: 'sellPrivately' });
      expect(t('foot.notEnrolled')).toMatch(/mediazion|mediaci[oó]n|not enrolled/i);
    }
  });

  it('does not render retracted ledger rows as tiles or steps', () => {
    const ledger = getSellPrivatelyLedger();
    expect(ledger.promises.P4.state).toBe('retracted');
    expect(getSellPrivatelyBenefits(ledger).map((b) => b.status)).not.toContain('retracted');
    expect(getSellPrivatelySteps(ledger).map((s) => s.id)).not.toContain('buyers');
  });

  it('site chrome tagline no longer claims a licensed agency', () => {
    expect(itMessages.brand.tagline).not.toMatch(/agenzia regolare/i);
    expect(enMessages.brand.tagline).not.toMatch(/licensed agency/i);
    expect(esMessages.brand.tagline).not.toMatch(/agencia regulada/i);
  });

  it('ships an 8-scene seller intro film with frames on disk', () => {
    expect(SELLER_INTRO_FRAMES).toHaveLength(8);
    for (const locale of Object.keys(LOCALES) as Array<keyof typeof LOCALES>) {
      const t = createTranslator({ locale, messages: LOCALES[locale], namespace: 'sellPrivately' });
      expect((t.raw('film.scenes') as unknown[]).length).toBe(8);
    }
    for (const file of SELLER_INTRO_FRAME_FILES) {
      expect(existsSync(join(publicFilm, file)), file).toBe(true);
    }
  });

  it('opens the 16:9 intro.html master in the locale of the page', () => {
    expect(sellerIntroFullscreenSrc('it')).toBe('/vendi-da-privato/film/intro.html?lang=it&record=1');
    expect(sellerIntroFullscreenSrc('en')).toBe('/vendi-da-privato/film/intro.html?lang=en&record=1');
    expect(sellerIntroFullscreenSrc('es')).toBe('/vendi-da-privato/film/intro.html?lang=es&record=1');
    expect(sellerIntroFullscreenSrc('de')).toBe('/vendi-da-privato/film/intro.html?lang=it&record=1');
  });

  it('keeps OMI as zone data after sign-in and ownership check off the publish gate', () => {
    for (const locale of Object.keys(LOCALES) as Array<keyof typeof LOCALES>) {
      const t = createTranslator({ locale, messages: LOCALES[locale], namespace: 'sellPrivately' });
      const scenes = t.raw('film.scenes') as Array<{ title: string; body: string }>;
      const hay = scenes.map((s) => `${s.title} ${s.body}`).join(' ');
      expect(hay.toLowerCase()).toMatch(/sign in|accedi|iniciar sesi[oó]n|dopo l|after you|tras iniciar/);
      expect(hay.toLowerCase()).toMatch(/not a requirement|non è un requisito|no es un requisito/);
      expect(hay).not.toMatch(FORBIDDEN_ON_PAGE);
    }
  });
});
