/**
 * K EC 7.4 — first-contact templates agent (B4A order, EC copy).
 * Language → welcome / off-hours → three estate-agency buttons.
 * No Assist / Consult / FAQ. No credit journeys. Humans take over from the inbox.
 */

export const JOURNEY_LOCALES = ['it', 'en', 'es'] as const;
export type JourneyLocale = (typeof JOURNEY_LOCALES)[number];

export const LANGUAGE_REPLY_IDS: Readonly<Record<string, JourneyLocale>> = {
  lang_it: 'it',
  lang_en: 'en',
  lang_es: 'es',
};

/** New EC ids — never reuse B4A credit button ids. */
export const JOURNEY_BUTTON_IDS = {
  bookViewing: 'book_viewing',
  searchBrief: 'search_brief',
  openListings: 'open_listings',
} as const;

export type JourneyContactType = 'lead' | 'client';

export type JourneyStep =
  | 'none'
  | 'language'
  | 'greeted'
  | 'book_viewing'
  | 'search_brief'
  | 'brief_received'
  | 'open_listings';

export type JourneyState = {
  language: JourneyLocale | null;
  greetingSentAt: Date | null;
  lastLanguagePromptAt: Date | null;
  lastInboundAt: Date | null;
  lastCasualPromptAt: Date | null;
  journeyStep: JourneyStep;
  contactType: JourneyContactType;
  blockedAt: Date | null;
};

export type JourneyInbound = {
  text: string | null;
  interactiveId: string | null;
  receivedAt: Date;
};

export type JourneyAction =
  | { type: 'none'; reason: string }
  | { type: 'language_list' }
  | { type: 'language_nudge' }
  | { type: 'welcome'; locale: JourneyLocale; offHours: boolean }
  | { type: 'book_viewing'; locale: JourneyLocale }
  | { type: 'search_brief'; locale: JourneyLocale }
  | { type: 'open_listings'; locale: JourneyLocale }
  | { type: 'save_brief'; locale: JourneyLocale; text: string };

export const LANGUAGE_COOLDOWN_MS = 60 * 60 * 1000;
export const IDLE_REPROMPT_MS = 4 * 60 * 60 * 1000;
export const BUSINESS_HOUR_START = 6;
export const BUSINESS_HOUR_END = 22;
export const ROME_TZ = 'Europe/Rome';

const CASUAL_HI =
  /^(hi|hello|hey|ciao|hola|salve|buongiorno|buonasera|buon giorno|good morning|good evening)$/i;

export function isJourneyLocale(value: string | null | undefined): value is JourneyLocale {
  return value === 'it' || value === 'en' || value === 'es';
}

export function parseLanguageReplyId(id: string | null | undefined): JourneyLocale | null {
  if (!id) return null;
  return LANGUAGE_REPLY_IDS[id.trim()] ?? null;
}

export function isJourneyButtonId(id: string | null | undefined): id is
  | typeof JOURNEY_BUTTON_IDS.bookViewing
  | typeof JOURNEY_BUTTON_IDS.searchBrief
  | typeof JOURNEY_BUTTON_IDS.openListings {
  if (!id) return false;
  return (
    id === JOURNEY_BUTTON_IDS.bookViewing ||
    id === JOURNEY_BUTTON_IDS.searchBrief ||
    id === JOURNEY_BUTTON_IDS.openListings
  );
}

export function romeHour(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROME_TZ,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  return Number.isFinite(hour) ? hour : now.getUTCHours();
}

/** 06:00–22:00 Europe/Rome (inclusive start, exclusive end). */
export function isBusinessHours(now: Date): boolean {
  const hour = romeHour(now);
  return hour >= BUSINESS_HOUR_START && hour < BUSINESS_HOUR_END;
}

export function isCasualHi(text: string | null | undefined): boolean {
  if (!text) return false;
  return CASUAL_HI.test(text.trim());
}

export function emptyJourneyState(): JourneyState {
  return {
    language: null,
    greetingSentAt: null,
    lastLanguagePromptAt: null,
    lastInboundAt: null,
    lastCasualPromptAt: null,
    journeyStep: 'none',
    contactType: 'lead',
    blockedAt: null,
  };
}

/**
 * Templates-agent order (B4A §3.3 steps 1–5 only).
 * Established portal clients skip and wait for a human.
 */
export function decideJourneyAction(state: JourneyState, inbound: JourneyInbound): JourneyAction {
  if (state.blockedAt) return { type: 'none', reason: 'blocked' };
  if (state.contactType === 'client') return { type: 'none', reason: 'client_human_only' };

  const localeFromReply = parseLanguageReplyId(inbound.interactiveId);
  if (localeFromReply) {
    return { type: 'welcome', locale: localeFromReply, offHours: !isBusinessHours(inbound.receivedAt) };
  }

  const locale = state.language;
  if (isJourneyButtonId(inbound.interactiveId) && locale) {
    if (inbound.interactiveId === JOURNEY_BUTTON_IDS.bookViewing) {
      return { type: 'book_viewing', locale };
    }
    if (inbound.interactiveId === JOURNEY_BUTTON_IDS.searchBrief) {
      return { type: 'search_brief', locale };
    }
    return { type: 'open_listings', locale };
  }

  const typed = inbound.text?.trim() || null;
  if (state.journeyStep === 'search_brief' && locale && typed && !inbound.interactiveId) {
    return { type: 'save_brief', locale, text: typed };
  }

  if (!locale) {
    const lastPrompt = state.lastLanguagePromptAt;
    const sincePrompt = lastPrompt ? inbound.receivedAt.getTime() - lastPrompt.getTime() : Infinity;
    if (!lastPrompt) return { type: 'language_list' };
    if (sincePrompt < LANGUAGE_COOLDOWN_MS) return { type: 'none', reason: 'language_cooldown' };
    if (typed && !inbound.interactiveId) return { type: 'language_nudge' };
    return { type: 'language_list' };
  }

  if (!state.greetingSentAt) {
    return { type: 'welcome', locale, offHours: !isBusinessHours(inbound.receivedAt) };
  }

  const lastIn = state.lastInboundAt;
  const idleMs = lastIn ? inbound.receivedAt.getTime() - lastIn.getTime() : 0;
  if (idleMs >= IDLE_REPROMPT_MS && isCasualHi(typed)) {
    return { type: 'language_list' };
  }

  return { type: 'none', reason: 'human_inbox' };
}

export type JourneyCopy = {
  languageListBody: string;
  languageListButton: string;
  languageNudge: string;
  welcome: string;
  offHours: string;
  bookViewing: string;
  searchBrief: string;
  openListings: string;
  briefThanks: string;
  buttons: { id: string; title: string }[];
  languages: { id: string; title: string; description: string }[];
};

const COPY: Record<JourneyLocale, Omit<JourneyCopy, 'buttons' | 'languages'>> = {
  it: {
    languageListBody: 'Scegli la lingua / Choose language / Elige el idioma',
    languageListButton: 'Lingua',
    languageNudge:
      "Tocca un'opzione dell'elenco per scegliere la lingua. / Tap a list option to choose your language.",
    welcome:
      'Ciao, questo è il canale WhatsApp di EasyCasa — portale di annunci immobiliari. Scegli cosa vuoi fare:',
    offHours:
      'Siamo fuori orario (22:00–06:00 Europe/Rome). Un operatore risponderà in mattinata. Nel frattempo puoi scegliere:',
    bookViewing:
      "Per prenotare una visita, indica l'annuncio o la città. Un operatore ti risponderà su WhatsApp.",
    searchBrief:
      "Scrivi città e fascia di prezzo che stai cercando (preferenza di ricerca, non un'offerta). Un operatore ti risponderà qui.",
    openListings: 'Puoi sfogliare gli annunci sul portale EasyCasa.',
    briefThanks:
      'Grazie. Abbiamo salvato la preferenza di ricerca. Un operatore ti risponderà su WhatsApp.',
  },
  en: {
    languageListBody: 'Scegli la lingua / Choose language / Elige el idioma',
    languageListButton: 'Language',
    languageNudge:
      "Tap a list option to choose your language. / Tocca un'opzione dell'elenco per la lingua.",
    welcome:
      'Hi — this is the EasyCasa WhatsApp channel (property listing portal). Choose what you want to do:',
    offHours:
      'We are outside hours (22:00–06:00 Europe/Rome). A person will reply in the morning. Meanwhile you can choose:',
    bookViewing:
      'To book a viewing, send the listing or the city. A person will reply on WhatsApp.',
    searchBrief:
      'Send the city and price band you are looking for (a search preference, not an offer). A person will reply here.',
    openListings: 'You can browse listings on the EasyCasa portal.',
    briefThanks: 'Thanks. We saved the search preference. A person will reply on WhatsApp.',
  },
  es: {
    languageListBody: 'Scegli la lingua / Choose language / Elige el idioma',
    languageListButton: 'Idioma',
    languageNudge:
      'Toca una opción de la lista para elegir el idioma. / Tap a list option to choose your language.',
    welcome:
      'Hola — este es el canal WhatsApp de EasyCasa (portal de anuncios). Elige qué quieres hacer:',
    offHours:
      'Estamos fuera de horario (22:00–06:00 Europe/Rome). Una persona responderá por la mañana. Mientras tanto puedes elegir:',
    bookViewing:
      'Para reservar una visita, indica el anuncio o la ciudad. Una persona te responderá en WhatsApp.',
    searchBrief:
      'Escribe ciudad y franja de precio que buscas (preferencia de búsqueda, no una oferta). Una persona te responderá aquí.',
    openListings: 'Puedes ver los anuncios en el portal EasyCasa.',
    briefThanks:
      'Gracias. Guardamos la preferencia de búsqueda. Una persona te responderá en WhatsApp.',
  },
};

const BUTTONS: Record<JourneyLocale, JourneyCopy['buttons']> = {
  it: [
    { id: JOURNEY_BUTTON_IDS.bookViewing, title: 'Prenota visita' },
    { id: JOURNEY_BUTTON_IDS.searchBrief, title: 'Cosa cerchi' },
    { id: JOURNEY_BUTTON_IDS.openListings, title: 'Apri annunci' },
  ],
  en: [
    { id: JOURNEY_BUTTON_IDS.bookViewing, title: 'Book viewing' },
    { id: JOURNEY_BUTTON_IDS.searchBrief, title: 'Search pref.' },
    { id: JOURNEY_BUTTON_IDS.openListings, title: 'Open listings' },
  ],
  es: [
    { id: JOURNEY_BUTTON_IDS.bookViewing, title: 'Reservar visita' },
    { id: JOURNEY_BUTTON_IDS.searchBrief, title: 'Qué buscas' },
    { id: JOURNEY_BUTTON_IDS.openListings, title: 'Abrir anuncios' },
  ],
};

const LANGUAGES: JourneyCopy['languages'] = [
  { id: 'lang_it', title: 'Italiano', description: 'IT' },
  { id: 'lang_en', title: 'English', description: 'EN' },
  { id: 'lang_es', title: 'Español', description: 'ES' },
];

export function journeyCopy(locale: JourneyLocale): JourneyCopy {
  return {
    ...COPY[locale],
    buttons: BUTTONS[locale],
    languages: LANGUAGES,
  };
}
