import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  GROUP_DISPLAY_NAME,
  corpus,
  kbCards,
  limitViolations,
  pickerLocales,
  questionIds,
  routeCard,
} from './corpus';
import { emptySession, reduceIntake } from './machine';
import { scrubAnswer } from './scrub';
import { parseSummary, summaryInput } from './summary';

const SHIPPED_EN = { reviews: { en: 'approved', pa: 'approved', hi: 'approved', it: 'approved' }, shipped: { en: true, pa: true, hi: true, it: true } };

const REPORT_SENTENCE: Record<string, { welcome: string; card: string }> = {
  hi: {
    welcome: 'रिपोर्ट इतालवी, अंग्रेज़ी या स्पैनिश में मिलती है',
    card: 'रिपोर्ट इतालवी, अंग्रेज़ी या स्पेनिश में हैं',
  },
  ur: {
    welcome: 'رپورٹ اطالوی، انگریزی یا ہسپانوی میں ملتی ہے',
    card: 'رپورٹ اطالوی، انگریزی یا ہسپانوی میں ہیں',
  },
  pa: {
    welcome: 'رپورٹ اطالوی، انگریزی یا ہسپانوی وچ ملدی اے',
    card: 'رپورٹ اطالوی، انگریزی یا ہسپانوی وچ ملدی اے',
  },
  bn: {
    welcome: 'রিপোর্ট ইতালীয়, ইংরেজি বা স্প্যানিশ ভাষায় পাওয়া যায়',
    card: 'রিপোর্ট ইতালীয়, ইংরেজি বা স্প্যানিশ ভাষায়',
  },
  ar: {
    welcome: 'التقارير بالإيطالية أو الإنجليزية أو الإسبانية',
    card: 'التقارير بالإيطالية أو الإنجليزية أو الإسبانية',
  },
};

const FALSE_CLAIMS: Record<string, string[]> = {
  it: ['redazione all\'ingresso', 'semaforo', 'percorso di finanziamento', 'revisione umana prima della pubblicazione'],
  en: ['redaction at ingest', 'traffic-light', 'traffic light', 'financing route', 'human review before publish'],
  es: ['redacción al ingerir', 'semáforo', 'ruta de financiación', 'revisión humana antes de publicar'],
  hi: ['ट्रैफिक लाइट', 'फाइनेंसिंग रूट'],
  ur: ['ٹریفک لائٹ', 'فنانسنگ روٹ'],
  pa: ['ٹریفک لائٹ', 'فنانسنگ روٹ'],
  bn: ['ট্রাফিক লাইট', 'ফাইন্যান্সিং রুট'],
  ar: ['إشارة مرور', 'مسار تمويل'],
  fr: ['feu tricolore', 'revue humaine avant publication', 'rédaction à l\'ingestion'],
};

describe('EC-WA-INTAKE-1 corpus', () => {
  it('keeps the group name in one constant that matches the corpus', () => {
    expect(GROUP_DISPLAY_NAME).toBe('Ayni Group Italia');
    expect(GROUP_DISPLAY_NAME).toBe(corpus.group_display_name);
  });

  it('leaves every locale in draft, so the picker is empty', () => {
    expect(corpus.locales.every((code) => corpus.strings[code as keyof typeof corpus.strings].review === 'draft')).toBe(true);
    expect(pickerLocales()).toEqual([]);
  });

  it('keeps French cards and keeps French out of the picker', () => {
    expect(kbCards.fr?.route_buy).toContain('Easy Casa Italia');
    expect(pickerLocales({ reviews: { fr: 'approved' }, shipped: { fr: true } })).not.toContain('fr');
  });

  it('gives every picker locale every Italian key, inside WhatsApp limits', () => {
    const italian = Object.keys(corpus.strings.it.t);
    for (const code of corpus.locales) {
      const keys = Object.keys(corpus.strings[code as keyof typeof corpus.strings].t);
      expect(keys.sort()).toEqual([...italian].sort());
    }
    expect(limitViolations()).toEqual([]);
  });

  it('says reports are Italian, English or Spanish in the welcome and the auction card', () => {
    for (const [locale, sentence] of Object.entries(REPORT_SENTENCE)) {
      const welcome = corpus.strings[locale as 'hi'].t['welcome.body'];
      const card = routeCard(locale, 'route_auction') ?? '';
      expect(welcome).toContain(sentence.welcome);
      expect(card).toContain(sentence.card);
    }
  });

  it('does not claim the four false Easy Legenda facts', () => {
    const blobs: Record<string, string> = {};
    for (const [locale, pack] of Object.entries(corpus.strings)) {
      blobs[locale] = Object.values(pack.t).join('\n');
    }
    for (const [locale, cards] of Object.entries(kbCards)) {
      blobs[locale] = `${blobs[locale] ?? ''}\n${Object.values(cards).join('\n')}`;
    }
    for (const [locale, phrases] of Object.entries(FALSE_CLAIMS)) {
      const haystack = (blobs[locale] ?? '').toLowerCase();
      for (const phrase of phrases) {
        expect(haystack).not.toContain(phrase.toLowerCase());
      }
    }
  });

  it('ports the Mundida English card, which differs from the corpus reference', () => {
    expect(kbCards.en?.route_buy).toContain('Shall I show the next times?');
    expect(corpus.route_cards_new_locales.en.t.route_buy).not.toContain('Shall I show the next times?');
  });
});

describe('EC-WA-INTAKE-1 flow', () => {
  it('stores row ids, then drops an unfinished intake on a language restart', () => {
    const at = '2026-11-10T12:00:00.000Z';
    const session = emptySession(at);
    let turn = reduceIntake(session, { kind: 'interactive', interactiveId: 'en', at }, SHIPPED_EN);
    expect(turn.outbound[0]?.type).toBe('list');
    turn = reduceIntake(turn.session, { kind: 'interactive', interactiveId: 'route_buy', at }, SHIPPED_EN);
    expect(turn.session.answers).toEqual({});
    turn = reduceIntake(turn.session, { kind: 'interactive', interactiveId: 'found_home', at }, SHIPPED_EN);
    expect(turn.session.answers.B1).toBe('found_home');
    const restarted = reduceIntake(turn.session, { kind: 'text', text: 'language', at }, SHIPPED_EN);
    expect(restarted.restarted).toBe(true);
    expect(restarted.handoff).toBeNull();
    expect(restarted.session.answers).toEqual({});
    expect(restarted.session.route).toBeNull();
    expect(restarted.session.locale).toBeNull();
  });

  it('refuses media once and does not advance the question', () => {
    const at = '2026-11-10T12:00:00.000Z';
    const started = reduceIntake(emptySession(at), { kind: 'interactive', interactiveId: 'en', at }, SHIPPED_EN);
    const routed = reduceIntake(started.session, { kind: 'interactive', interactiveId: 'route_buy', at }, SHIPPED_EN);
    const first = reduceIntake(routed.session, { kind: 'media', mediaType: 'image', at }, SHIPPED_EN);
    expect(first.outbound.map((message) => message.body).join('\n')).toContain('legenda.easycasaita.com');
    expect(first.session.cursor).toBe(routed.session.cursor);
    const second = reduceIntake(first.session, { kind: 'media', mediaType: 'document', at }, SHIPPED_EN);
    expect(second.outbound).toEqual([]);
    expect(second.session.media).toHaveLength(2);
  });

  it('hides the call button where booking strings do not exist', () => {
    const at = '2026-11-10T12:00:00.000Z';
    const ids = questionIds('route_buy');
    const session = emptySession(at);
    session.locale = 'pa';
    session.route = 'route_buy';
    session.cursor = ids.indexOf('close.name');
    const turn = reduceIntake(session, { kind: 'text', text: 'Ada', at }, SHIPPED_EN);
    const buttons = turn.outbound[0];
    expect(buttons?.type).toBe('buttons');
    if (buttons?.type === 'buttons') expect(buttons.buttons.map((button) => button.id)).toEqual(['write']);
  });

  it('adds the call-language note outside Italian, English and Spanish', () => {
    const at = '2026-11-10T12:00:00.000Z';
    const ids = questionIds('route_buy');
    const session = emptySession(at);
    session.locale = 'hi';
    session.route = 'route_buy';
    session.cursor = ids.indexOf('close.name');
    const turn = reduceIntake(session, { kind: 'text', text: 'Ada', at }, SHIPPED_EN);
    const buttons = turn.outbound[0];
    expect(buttons?.type).toBe('buttons');
    if (buttons?.type === 'buttons') {
      expect(buttons.buttons.map((button) => button.id)).toEqual(['call', 'write']);
      expect(buttons.body).toContain(corpus.strings.hi.t['close.call_language_note']);
    }
  });
});

describe('EC-WA-INTAKE-1 fences', () => {
  it('scrubs fiscal codes, IBANs, card numbers and id-shaped tokens before save', () => {
    const raw = 'CF RSSMRA85T10A562S IBAN IT60X0542811101000000123456 card 4242424242424242 doc AB1234567';
    const cleaned = scrubAnswer(raw, 1000);
    expect(cleaned).not.toContain('RSSMRA85T10A562S');
    expect(cleaned).not.toContain('IT60X0542811101000000123456');
    expect(cleaned).not.toContain('4242424242424242');
    expect(cleaned).not.toContain('AB1234567');
    expect(cleaned).toContain('[removed]');
  });

  it('never downloads media and the summary module cannot send', () => {
    const root = join(process.cwd(), 'src/whatsapp');
    const inbound = readFileSync(join(root, 'whatsapp-inbound.service.ts'), 'utf8');
    const intake = readFileSync(join(root, 'whatsapp-intake.service.ts'), 'utf8');
    const summary = readFileSync(join(root, 'intake/summary.ts'), 'utf8');
    for (const source of [inbound, intake]) {
      expect(source).not.toContain('graph.facebook.com');
      expect(source).not.toContain('downloadMedia');
    }
    expect(summary).not.toMatch(/whatsapp-cloud|whatsapp\.service|sendTemplate|WhatsAppCloudClient/);
  });

  it('drops financing content from the summary and rejects a bad payload', () => {
    const input = summaryInput({
      route: 'route_buy',
      locale: 'bn',
      answers: { B2: 'a house', 'close.name': 'Ada', wa_id: '3900' },
      stageIds: ['found_home'],
    });
    expect(input.answers).toEqual({ B2: 'a house' });
    const parsed = parseSummary(JSON.stringify({
      summary_it: 'Chiede un mutuo di 200000 euro',
      summary_en: 'Asks about a mortgage',
      answers_translated_it: { B2: 'mutuo 200000' },
      stage: 'found_home',
      help_requested: ['other'],
      urgency: 'unknown',
      customer_questions: ['posso avere un mutuo?'],
      flags: ['financing_mentioned'],
    }), ['found_home']);
    expect(parsed?.answers_translated_it).toEqual({});
    expect(parsed?.customer_questions).toEqual([]);
    expect(parsed?.summary_it).not.toContain('200000');
    expect(parseSummary('not json', [])).toBeNull();
  });
});
