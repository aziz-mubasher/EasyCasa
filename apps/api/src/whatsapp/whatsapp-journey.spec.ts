import { describe, expect, it } from 'vitest';

import {
  decideJourneyAction,
  emptyJourneyState,
  isBusinessHours,
  isCasualHi,
  isJourneyButtonId,
  JOURNEY_BUTTON_IDS,
  journeyCopy,
  LANGUAGE_COOLDOWN_MS,
  parseLanguageReplyId,
  romeHour,
} from './whatsapp-journey';

const noonUtc = new Date('2026-09-03T10:00:00.000Z'); // 12:00 Rome (CEST)
const nightUtc = new Date('2026-09-03T21:30:00.000Z'); // 23:30 Rome

describe('whatsapp-journey helpers', () => {
  it('maps language reply ids and rejects credit leftovers', () => {
    expect(parseLanguageReplyId('lang_it')).toBe('it');
    expect(parseLanguageReplyId('lang_en')).toBe('en');
    expect(parseLanguageReplyId('buying_a_house')).toBeNull();
    expect(isJourneyButtonId('book_viewing')).toBe(true);
    expect(isJourneyButtonId('book_onboarding_call')).toBe(false);
    expect(isJourneyButtonId('plan_mutuo')).toBe(false);
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
    for (const locale of ['it', 'en', 'es'] as const) {
      for (const b of journeyCopy(locale).buttons) {
        expect(b.title.length).toBeLessThanOrEqual(20);
        expect(Object.values(JOURNEY_BUTTON_IDS)).toContain(b.id);
      }
    }
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
  });

  it('three EC buttons only after language is saved', () => {
    const withLang = { ...emptyJourneyState(), language: 'it' as const, greetingSentAt: noonUtc };
    expect(
      decideJourneyAction(withLang, {
        text: null,
        interactiveId: 'book_viewing',
        receivedAt: noonUtc,
      }),
    ).toEqual({ type: 'book_viewing', locale: 'it' });
    expect(
      decideJourneyAction(withLang, {
        text: null,
        interactiveId: 'search_brief',
        receivedAt: noonUtc,
      }),
    ).toEqual({ type: 'search_brief', locale: 'it' });
    expect(
      decideJourneyAction(withLang, {
        text: null,
        interactiveId: 'open_listings',
        receivedAt: noonUtc,
      }),
    ).toEqual({ type: 'open_listings', locale: 'it' });
    expect(
      decideJourneyAction(emptyJourneyState(), {
        text: null,
        interactiveId: 'book_viewing',
        receivedAt: noonUtc,
      }).type,
    ).not.toBe('book_viewing');
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
