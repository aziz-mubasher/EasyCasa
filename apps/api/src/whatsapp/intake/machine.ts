import {
  GROUP_DISPLAY_NAME,
  STAFFED_CALL_LOCALES,
  bookingLocales,
  corpus,
  pickerLocales,
  questionCount,
  questionIds,
  routeCard,
  text,
  type ShippingInput,
} from './corpus';
import { scrubAnswer } from './scrub';

export { GROUP_DISPLAY_NAME };

const LIVE_OTHER_LANGUAGES = 'Altre lingue · More languages · لغات أخرى';

/** Buttons from the previous journey. A tap must not fall through to silence. */
const LEGACY_LOCALE: Record<string, string> = {
  lang_it: 'it',
  lang_en: 'en',
  lang_es: 'es',
  lang_hi: 'hi',
  lang_ur: 'ur',
  lang_pa: 'pa',
  lang_bn: 'bn',
  lang_ar: 'ar',
};

const LEGACY_ROUTE: Record<string, string> = {
  buy_property: 'route_buy',
  sell_property: 'route_sell',
  easy_legenda: 'route_auction',
};

export type Outbound =
  | { type: 'text'; body: string }
  | { type: 'buttons'; body: string; buttons: { id: string; title: string }[] }
  | { type: 'list'; body: string; button: string; rows: { id: string; title: string; description?: string }[] };

export type IntakeSession = {
  locale: string | null;
  route: string | null;
  /** Index into questionIds(route). -1 until a route is chosen. */
  cursor: number;
  answers: Record<string, string>;
  media: { type: string; receivedAt: string }[];
  mediaNoticeSent: boolean;
  disclosureSentAt: string | null;
  lastCustomerAt: string;
};

export type InboundTurn = {
  kind: 'text' | 'interactive' | 'media';
  text?: string | null;
  interactiveId?: string | null;
  mediaType?: string | null;
  at: string;
};

export type TurnResult = {
  session: IntakeSession;
  outbound: Outbound[];
  handoff: null | { status: 'complete'; contactPref: 'call' | 'write' | null };
  restarted: boolean;
};

export function emptySession(at: string): IntakeSession {
  return {
    locale: null,
    route: null,
    cursor: -1,
    answers: {},
    media: [],
    mediaNoticeSent: false,
    disclosureSentAt: null,
    lastCustomerAt: at,
  };
}

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function shippedSet(input: ShippingInput): Set<string> {
  return new Set(pickerLocales(input));
}

type LanguageHit = { kind: 'picker' } | { kind: 'locale'; code: string } | null;

function languageHit(turn: InboundTurn): LanguageHit {
  if (turn.kind === 'interactive' && turn.interactiveId) {
    if (turn.interactiveId === 'other_languages') return { kind: 'picker' };
    const legacy = LEGACY_LOCALE[turn.interactiveId];
    if (legacy) return { kind: 'locale', code: legacy };
    if (corpus.locales.includes(turn.interactiveId)) return { kind: 'locale', code: turn.interactiveId };
    return null;
  }
  if (turn.kind !== 'text' || !turn.text) return null;
  const value = norm(turn.text);
  if (value === 'language' || value === 'lingua' || value === 'idioma') return { kind: 'picker' };
  const other = corpus.selector.ice_breakers[3];
  if ((other && value === norm(other)) || value === norm(LIVE_OTHER_LANGUAGES)) return { kind: 'picker' };
  for (const [code, label] of Object.entries(corpus.selector.rows)) {
    if (value === norm(label)) return { kind: 'locale', code };
  }
  return null;
}

function markDisclosure(session: IntakeSession, at: string): void {
  if (!session.disclosureSentAt) session.disclosureSentAt = at;
}

function pickerMessage(): Outbound {
  return {
    type: 'list',
    body: corpus.selector.body,
    button: corpus.selector.button,
    rows: [],
  };
}

function withPickerRows(message: Outbound, locales: string[]): Outbound {
  if (message.type !== 'list') return message;
  return {
    ...message,
    rows: locales.map((code) => ({ id: code, title: corpus.selector.rows[code as keyof typeof corpus.selector.rows] ?? code })),
  };
}

function welcomeMessage(locale: string): Outbound {
  const rows = (['buy', 'sell', 'auction', 'other', 'human'] as const).map((key) => ({
    id: `route_${key}`,
    title: text(locale, `route.${key}.title`),
    description: text(locale, `route.${key}.desc`),
  }));
  return { type: 'list', body: text(locale, 'welcome.body'), button: text(locale, 'welcome.button'), rows };
}

function isSkip(value: string, locale: string): boolean {
  const folded = norm(value);
  if (folded === 'skip' || folded === '-') return true;
  return folded === norm(text(locale, 'intake.skip'));
}

export function isLanguageRestart(turn: InboundTurn): boolean {
  return languageHit(turn) != null;
}

/** After the first consultant message the script stays quiet, except a language restart or the media refusal. */
export function consultantBotAction(
  consultantReplied: boolean,
  turn: InboundTurn,
): 'script' | 'media' | 'silent' {
  if (!consultantReplied) return 'script';
  if (isLanguageRestart(turn)) return 'script';
  if (turn.kind === 'media') return 'media';
  return 'silent';
}

function questionMessage(locale: string, id: string): Outbound {
  if (id === 'close.call_time') {
    return {
      type: 'buttons',
      body: text(locale, 'close.call_time'),
      buttons: [{ id: 'skip', title: text(locale, 'intake.skip') }],
    };
  }
  if (id === 'close.name') {
    return {
      type: 'buttons',
      body: text(locale, 'close.name'),
      buttons: [{ id: 'skip', title: text(locale, 'intake.skip') }],
    };
  }
  if (id === 'close.contact') {
    const buttons: { id: string; title: string }[] = [];
    if (bookingLocales.has(locale)) {
      buttons.push({ id: 'call', title: text(locale, 'close.contact.buttons.call') });
    }
    buttons.push({ id: 'write', title: text(locale, 'close.contact.buttons.write') });
    let body = text(locale, 'close.contact.body');
    const staffed = new Set<string>(STAFFED_CALL_LOCALES);
    if (buttons.some((button) => button.id === 'call') && !staffed.has(locale)) {
      body = `${body}\n${text(locale, 'close.call_language_note')}`;
    }
    return { type: 'buttons', body, buttons };
  }
  const spec = corpus.questions[id as keyof typeof corpus.questions] as { type: string; rows?: string[]; buttons?: string[] } | undefined;
  if (spec?.type === 'list' && spec.rows) {
    return {
      type: 'list',
      body: text(locale, `q.${id}.body`),
      button: text(locale, 'welcome.button'),
      rows: spec.rows.map((row) => ({ id: row, title: text(locale, `q.${id}.rows.${row}`) })),
    };
  }
  if (spec?.type === 'buttons' && spec.buttons) {
    return {
      type: 'buttons',
      body: text(locale, `q.${id}.body`),
      buttons: spec.buttons.map((button) => ({ id: button, title: text(locale, `q.${id}.buttons.${button}`) })),
    };
  }
  return {
    type: 'buttons',
    body: text(locale, `q.${id}`),
    buttons: [{ id: 'skip', title: text(locale, 'intake.skip') }],
  };
}

function startRoute(session: IntakeSession, route: string): Outbound[] {
  const locale = session.locale;
  if (!locale) return [];
  session.route = route;
  session.cursor = 0;
  session.answers = {};
  const card = routeCard(locale, route);
  const ids = questionIds(route);
  const first = ids[0];
  const outbound: Outbound[] = [];
  if (card) outbound.push({ type: 'text', body: card });
  outbound.push({ type: 'text', body: text(locale, 'intake.intro', { n: questionCount(route) }) });
  if (first) outbound.push(questionMessage(locale, first));
  return outbound;
}

function answerFor(session: IntakeSession, id: string, turn: InboundTurn): string | null {
  const locale = session.locale;
  if (!locale) return null;
  if (turn.kind === 'interactive' && turn.interactiveId) {
    if (turn.interactiveId === 'skip') return 'skip';
    return turn.interactiveId;
  }
  if (turn.kind !== 'text' || !turn.text?.trim()) return null;
  if (isSkip(turn.text, locale)) return 'skip';
  return scrubAnswer(turn.text.trim(), corpus.answer_max_chars);
}

export function reduceIntake(current: IntakeSession | null, turn: InboundTurn, shipping: ShippingInput = {}): TurnResult {
  const allowed = shippedSet(shipping);
  const base = current ?? emptySession(turn.at);
  const session: IntakeSession = {
    ...base,
    answers: { ...base.answers },
    media: [...base.media],
    lastCustomerAt: turn.at,
  };
  const hadIntake = Boolean(current && (current.route || current.cursor >= 0 || Object.keys(current.answers).length > 0));

  if (turn.kind === 'media') {
    session.media.push({ type: turn.mediaType || 'media', receivedAt: turn.at });
    const outbound: Outbound[] = [];
    if (!session.mediaNoticeSent && session.locale) {
      session.mediaNoticeSent = true;
      outbound.push({ type: 'text', body: text(session.locale, 'intake.media_refused') });
    } else if (!session.mediaNoticeSent && !session.locale) {
      session.mediaNoticeSent = true;
      outbound.push({ type: 'text', body: corpus.selector.body });
      markDisclosure(session, turn.at);
    }
    return { session, outbound, handoff: null, restarted: false };
  }

  const language = languageHit(turn);
  if (language) {
    const next = emptySession(turn.at);
    next.mediaNoticeSent = false;
    if (language.kind === 'locale' && allowed.has(language.code)) {
      next.locale = language.code;
      markDisclosure(next, turn.at);
      return { session: next, outbound: [welcomeMessage(language.code)], handoff: null, restarted: hadIntake };
    }
    const rows = [...allowed];
    const picker = withPickerRows(pickerMessage(), rows);
    if (picker.type === 'list') markDisclosure(next, turn.at);
    return {
      session: next,
      outbound: rows.length ? [picker] : [],
      handoff: null,
      restarted: hadIntake,
    };
  }

  if (turn.kind === 'interactive' && turn.interactiveId && LEGACY_ROUTE[turn.interactiveId]) {
    const route = LEGACY_ROUTE[turn.interactiveId];
    if (session.locale && allowed.has(session.locale)) {
      return { session, outbound: startRoute(session, route), handoff: null, restarted: false };
    }
  }

  if (!session.locale) {
    const rows = [...allowed];
    const picker = withPickerRows(pickerMessage(), rows);
    if (rows.length) markDisclosure(session, turn.at);
    return { session, outbound: rows.length ? [picker] : [], handoff: null, restarted: false };
  }

  if (!session.route || session.cursor < 0) {
    if (turn.kind === 'interactive' && turn.interactiveId && Object.prototype.hasOwnProperty.call(corpus.flows, turn.interactiveId)) {
      return { session, outbound: startRoute(session, turn.interactiveId), handoff: null, restarted: false };
    }
    if (turn.kind === 'interactive' && turn.interactiveId) {
      const rows = [...allowed];
      const picker = withPickerRows(pickerMessage(), rows);
      return { session, outbound: rows.length ? [picker] : [], handoff: null, restarted: false };
    }
    return { session, outbound: [welcomeMessage(session.locale)], handoff: null, restarted: false };
  }

  const idsBefore = questionIds(session.route, session.answers);
  const currentId = idsBefore[session.cursor];
  if (!currentId) {
    return { session, outbound: [], handoff: null, restarted: false };
  }
  const answer = answerFor(session, currentId, turn);
  if (answer == null) {
    return { session, outbound: [questionMessage(session.locale, currentId)], handoff: null, restarted: false };
  }
  session.answers = { ...session.answers, [currentId]: answer };
  const ids = questionIds(session.route, session.answers);
  const nextCursor = session.cursor + 1;
  if (nextCursor >= ids.length) {
    session.cursor = nextCursor;
    const pref = session.answers['close.contact'];
    const contactPref = pref === 'call' || pref === 'write' ? pref : null;
    return {
      session,
      outbound: [{ type: 'text', body: text(session.locale, 'done.write') }],
      handoff: { status: 'complete', contactPref },
      restarted: false,
    };
  }
  session.cursor = nextCursor;
  const nextId = ids[nextCursor]!;
  return { session, outbound: [questionMessage(session.locale, nextId)], handoff: null, restarted: false };
}
