import { describe, expect, it } from 'vitest';

import {
  decideJourneyAction,
  emptyJourneyState,
  isBusinessHours,
  isCasualHi,
  isJourneyButtonId,
  JOURNEY_BUTTON_IDS,
  JOURNEY_LOCALES,
  journeyCopy,
  LANGUAGE_COOLDOWN_MS,
  parseLanguageReplyId,
  romeHour,
  toCrmLocale,
} from './whatsapp-journey';

const noonUtc = new Date('2026-09-03T10:00:00.000Z'); // 12:00 Rome (CEST)
const nightUtc = new Date('2026-09-03T21:30:00.000Z'); // 23:30 Rome

describe('whatsapp-journey helpers', () => {
  it('maps language reply ids and rejects credit leftovers', () => {
    expect(parseLanguageReplyId('lang_it')).toBe('it');
    expect(parseLanguageReplyId('lang_en')).toBe('en');
    expect(parseLanguageReplyId('lang_ur')).toBe('ur');
    expect(parseLanguageReplyId('lang_hi')).toBe('hi');
    expect(parseLanguageReplyId('lang_pa')).toBe('pa');
    expect(parseLanguageReplyId('lang_ar')).toBe('ar');
    expect(parseLanguageReplyId('buying_a_house')).toBeNull();
    expect(isJourneyButtonId('buy_property')).toBe(true);
    expect(isJourneyButtonId('sell_property')).toBe(true);
    expect(isJourneyButtonId('easy_legenda')).toBe(true);
    expect(isJourneyButtonId('book_viewing')).toBe(true);
    expect(isJourneyButtonId('book_onboarding_call')).toBe(false);
    expect(isJourneyButtonId('plan_mutuo')).toBe(false);
  });

  it('maps extra WhatsApp locales onto the CRM it/en/es CHECK', () => {
    expect(toCrmLocale('it')).toBe('it');
    expect(toCrmLocale('en')).toBe('en');
    expect(toCrmLocale('es')).toBe('es');
    expect(toCrmLocale('pt')).toBe('es');
    expect(toCrmLocale('ur')).toBe('en');
    expect(toCrmLocale('hi')).toBe('en');
    expect(toCrmLocale('pa')).toBe('en');
    expect(toCrmLocale('fr')).toBe('en');
  });

  it('Rome business hours are 06:00–22:00', () => {
    expect(romeHour(noonUtc)).toBe(12);
    expect(isBusinessHours(noonUtc)).toBe(true);
    expect(isBusinessHours(nightUtc)).toBe(false);
  });

  it('casual hi is a whole-message token', () => {
    expect(isCasualHi('ciao')).toBe(true);
    expect(isCasualHi('Hello')).toBe(true);
    expect(isCasualHi('ciao vorrei un mutuo')).toBe(false);
  });

  it('IT button titles stay within Meta 20-char limit', () => {
    for (const locale of JOURNEY_LOCALES) {
      for (const b of journeyCopy(locale).buttons) {
        expect(b.title.length).toBeLessThanOrEqual(20);
        expect(Object.values(JOURNEY_BUTTON_IDS)).toContain(b.id);
      }
    }
  });

  it('welcome is EasyCasa Italia + buy/sell/asta buttons in every locale', () => {
    expect(journeyCopy('en').welcome).toBe(
      'Hi — this is the EasyCasa Italia WhatsApp channel. Choose what you want to do:',
    );
    expect(journeyCopy('en').welcome).not.toMatch(/property listing portal/);
    expect(journeyCopy('en').buttons.map((b) => b.title)).toEqual([
      'Buying Property',
      'Selling Property',
      'Easy Legenda (Asta)',
    ]);
    expect(journeyCopy('en').buttons.map((b) => b.id)).toEqual([
      JOURNEY_BUTTON_IDS.buyProperty,
      JOURNEY_BUTTON_IDS.sellProperty,
      JOURNEY_BUTTON_IDS.easyLegenda,
    ]);
    for (const locale of JOURNEY_LOCALES) {
      const copy = journeyCopy(locale);
      expect(copy.welcome).toMatch(/EasyCasa Italia/);
      expect(copy.welcome).not.toMatch(
        /property listing portal|portale di annunci|portal de anuncios|portail d.annonces|Immobilienportal|portal de anúncios|پراپرٹی پورٹل|प्रॉपर्टी पोर्टल|بوابة إعلانات/,
      );
      expect(copy.buttons).toHaveLength(3);
      expect(copy.buttons[2]!.title).toBe('Easy Legenda (Asta)');
    }
  });

  it('language ice-breaker is the 10-row B4A set within Meta list limits', () => {
    const langs = journeyCopy('it').languages;
    expect(langs).toHaveLength(10);
    expect(langs.map((l) => l.id)).toEqual([
      'lang_it',
      'lang_en',
      'lang_es',
      'lang_fr',
      'lang_de',
      'lang_pt',
      'lang_ur',
      'lang_hi',
      'lang_pa',
      'lang_ar',
    ]);
    for (const row of langs) {
      expect(row.title.length).toBeLessThanOrEqual(24);
      expect((row.description ?? '').length).toBeLessThanOrEqual(72);
    }
  });

  it('casual hi includes B4A neighbour greetings', () => {
    expect(isCasualHi('bonjour')).toBe(true);
    expect(isCasualHi('namaste')).toBe(true);
    expect(isCasualHi('salam')).toBe(true);
    expect(isCasualHi('hallo')).toBe(true);
  });
});

describe('decideJourneyAction', () => {
  it('skips blocked and established clients', () => {
    expect(
      decideJourneyAction(
        { ...emptyJourneyState(), blockedAt: noonUtc },
        { text: 'ciao', interactiveId: null, receivedAt: noonUtc },
      ),
    ).toEqual({ type: 'none', reason: 'blocked' });
    expect(
      decideJourneyAction(
        { ...emptyJourneyState(), contactType: 'client', language: 'it' },
        { text: 'ciao', interactiveId: null, receivedAt: noonUtc },
      ),
    ).toEqual({ type: 'none', reason: 'client_human_only' });
  });

  it('asks for language first, then cools down', () => {
    expect(
      decideJourneyAction(emptyJourneyState(), {
        text: 'ciao',
        interactiveId: null,
        receivedAt: noonUtc,
      }),
    ).toEqual({ type: 'language_list' });

    expect(
      decideJourneyAction(
        { ...emptyJourneyState(), lastLanguagePromptAt: noonUtc },
        {
          text: 'ciao',
          interactiveId: null,
          receivedAt: new Date(noonUtc.getTime() + 10 * 60_000),
        },
      ),
    ).toEqual({ type: 'none', reason: 'language_cooldown' });

    expect(
      decideJourneyAction(
        { ...emptyJourneyState(), lastLanguagePromptAt: noonUtc },
        {
          text: 'ciao',
          interactiveId: null,
          receivedAt: new Date(noonUtc.getTime() + LANGUAGE_COOLDOWN_MS + 1),
        },
      ),
    ).toEqual({ type: 'language_nudge' });
  });

  it('language tap → welcome in hours, off-hours at night', () => {
    expect(
      decideJourneyAction(emptyJourneyState(), {
        text: null,
        interactiveId: 'lang_it',
        receivedAt: noonUtc,
      }),
    ).toEqual({ type: 'welcome', locale: 'it', offHours: false });
    expect(
      decideJourneyAction(emptyJourneyState(), {
        text: null,
        interactiveId: 'lang_en',
        receivedAt: nightUtc,
      }),
    ).toEqual({ type: 'welcome', locale: 'en', offHours: true });
    expect(
      decideJourneyAction(emptyJourneyState(), {
        text: null,
        interactiveId: 'lang_ur',
        receivedAt: noonUtc,
      }),
    ).toEqual({ type: 'welcome', locale: 'ur', offHours: false });
  });

  it('three EC buttons only after language is saved', () => {
    const withLang = { ...emptyJourneyState(), language: 'it' as const, greetingSentAt: noonUtc };
    expect(
      decideJourneyAction(withLang, {
        text: null,
        interactiveId: 'buy_property',
        receivedAt: noonUtc,
      }),
    ).toEqual({ type: 'buy_property', locale: 'it' });
    expect(
      decideJourneyAction(withLang, {
        text: null,
        interactiveId: 'sell_property',
        receivedAt: noonUtc,
      }),
    ).toEqual({ type: 'sell_property', locale: 'it' });
    expect(
      decideJourneyAction(withLang, {
        text: null,
        interactiveId: 'easy_legenda',
        receivedAt: noonUtc,
      }),
    ).toEqual({ type: 'easy_legenda', locale: 'it' });
    expect(
      decideJourneyAction(withLang, {
        text: null,
        interactiveId: 'book_viewing',
        receivedAt: noonUtc,
      }),
    ).toEqual({ type: 'book_viewing', locale: 'it' });
    expect(
      decideJourneyAction(emptyJourneyState(), {
        text: null,
        interactiveId: 'buy_property',
        receivedAt: noonUtc,
      }).type,
    ).not.toBe('buy_property');
  });

  it('stores search-brief free text as a preference, then waits for a human', () => {
    expect(
      decideJourneyAction(
        {
          ...emptyJourneyState(),
          language: 'it',
          greetingSentAt: noonUtc,
          journeyStep: 'search_brief',
        },
        { text: 'Brescia, 200-300k', interactiveId: null, receivedAt: noonUtc },
      ),
    ).toEqual({ type: 'save_brief', locale: 'it', text: 'Brescia, 200-300k' });

    expect(
      decideJourneyAction(
        {
          ...emptyJourneyState(),
          language: 'it',
          greetingSentAt: noonUtc,
          journeyStep: 'greeted',
        },
        { text: 'vorrei visitare', interactiveId: null, receivedAt: noonUtc },
      ),
    ).toEqual({ type: 'none', reason: 'human_inbox' });
  });

  it('re-prompts language after ~4h idle + casual hi', () => {
    const last = new Date(noonUtc.getTime() - 5 * 60 * 60 * 1000);
    expect(
      decideJourneyAction(
        {
          ...emptyJourneyState(),
          language: 'it',
          greetingSentAt: last,
          lastInboundAt: last,
        },
        { text: 'ciao', interactiveId: null, receivedAt: noonUtc },
      ),
    ).toEqual({ type: 'language_list' });
  });
});
