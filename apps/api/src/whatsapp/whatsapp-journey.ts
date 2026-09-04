/**
 * K EC 7.4 / K EC 7.4b — first-contact templates agent (B4A order, EC copy).
 * Language list is the B4A WhatsApp ice-breaker set (10 rows = Meta list max).
 * Welcome / buttons stay estate-agency. No Assist / Consult / FAQ. No credit journeys.
 */

export const JOURNEY_LOCALES = [
  'it',
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'ur',
  'hi',
  'pa',
  'ar',
] as const;
export type JourneyLocale = (typeof JOURNEY_LOCALES)[number];

/** CRM `contacts.locale` stays it/en/es (DB CHECK). Map extras at the hook. */
export type CrmJourneyLocale = 'it' | 'en' | 'es';

export const LANGUAGE_REPLY_IDS: Readonly<Record<string, JourneyLocale>> = {
  lang_it: 'it',
  lang_en: 'en',
  lang_es: 'es',
  lang_fr: 'fr',
  lang_de: 'de',
  lang_pt: 'pt',
  lang_ur: 'ur',
  lang_hi: 'hi',
  lang_pa: 'pa',
  lang_ar: 'ar',
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

const JOURNEY_LOCALE_SET = new Set<string>(JOURNEY_LOCALES);

/**
 * B4A public consultation languages (IT/EN/ES/UR/HI/PA) plus EU/MENA neighbours
 * to fill Meta's 10-row interactive list.
 */
export function toCrmLocale(wa: string | null | undefined): CrmJourneyLocale {
  if (wa === 'en' || wa === 'es' || wa === 'it') return wa;
  if (wa === 'pt') return 'es';
  return 'en';
}

const CASUAL_HI =
  /^(hi|hello|hey|ciao|hola|salve|buongiorno|buonasera|buon giorno|good morning|good evening|bonjour|salut|hallo|olá|ola|namaste|salam|as-?salam|السلام عليكم|sat sri akal)$/i;

export function isJourneyLocale(value: string | null | undefined): value is JourneyLocale {
  return !!value && JOURNEY_LOCALE_SET.has(value);
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

const LANGUAGE_LIST_BODY =
  'Scegli la lingua / Choose language / Elige el idioma / زبان منتخب کریں';

const COPY: Record<JourneyLocale, Omit<JourneyCopy, 'buttons' | 'languages'>> = {
  it: {
    languageListBody: LANGUAGE_LIST_BODY,
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
    languageListBody: LANGUAGE_LIST_BODY,
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
    languageListBody: LANGUAGE_LIST_BODY,
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
  fr: {
    languageListBody: LANGUAGE_LIST_BODY,
    languageListButton: 'Langue',
    languageNudge: 'Touchez une option de la liste pour choisir la langue.',
    welcome:
      'Bonjour — ceci est le canal WhatsApp EasyCasa (portail d’annonces). Choisissez ce que vous voulez faire :',
    offHours:
      'Nous sommes hors horaires (22:00–06:00 Europe/Rome). Une personne répondra le matin. En attendant vous pouvez choisir :',
    bookViewing:
      'Pour réserver une visite, indiquez l’annonce ou la ville. Une personne répondra sur WhatsApp.',
    searchBrief:
      'Indiquez ville et fourchette de prix (préférence de recherche, pas une offre). Une personne répondra ici.',
    openListings: 'Vous pouvez parcourir les annonces sur le portail EasyCasa.',
    briefThanks:
      'Merci. Nous avons enregistré la préférence de recherche. Une personne répondra sur WhatsApp.',
  },
  de: {
    languageListBody: LANGUAGE_LIST_BODY,
    languageListButton: 'Sprache',
    languageNudge: 'Tippen Sie eine Listenoption, um die Sprache zu wählen.',
    welcome:
      'Hallo — das ist der EasyCasa-WhatsApp-Kanal (Immobilienportal). Wählen Sie, was Sie tun möchten:',
    offHours:
      'Wir sind außerhalb der Zeiten (22:00–06:00 Europe/Rome). Eine Person antwortet am Morgen. Bis dahin können Sie wählen:',
    bookViewing:
      'Für eine Besichtigung senden Sie das Inserat oder die Stadt. Eine Person antwortet auf WhatsApp.',
    searchBrief:
      'Stadt und Preisband (Suchpräferenz, kein Angebot). Eine Person antwortet hier.',
    openListings: 'Inserate finden Sie auf dem EasyCasa-Portal.',
    briefThanks:
      'Danke. Wir haben die Suchpräferenz gespeichert. Eine Person antwortet auf WhatsApp.',
  },
  pt: {
    languageListBody: LANGUAGE_LIST_BODY,
    languageListButton: 'Idioma',
    languageNudge: 'Toque numa opção da lista para escolher o idioma.',
    welcome:
      'Olá — este é o canal WhatsApp da EasyCasa (portal de anúncios). Escolha o que quer fazer:',
    offHours:
      'Estamos fora de horário (22:00–06:00 Europe/Rome). Uma pessoa responde de manhã. Entretanto pode escolher:',
    bookViewing:
      'Para marcar uma visita, indique o anúncio ou a cidade. Uma pessoa responde no WhatsApp.',
    searchBrief:
      'Envie cidade e faixa de preço (preferência de pesquisa, não uma oferta). Uma pessoa responde aqui.',
    openListings: 'Pode ver os anúncios no portal EasyCasa.',
    briefThanks:
      'Obrigado. Guardámos a preferência de pesquisa. Uma pessoa responde no WhatsApp.',
  },
  ur: {
    languageListBody: LANGUAGE_LIST_BODY,
    languageListButton: 'زبان',
    languageNudge: 'زبان چننے کے لیے فہرست سے ایک آپشن چھوئے۔',
    welcome:
      'السلام علیکم — یہ EasyCasa کا WhatsApp چینل ہے (پراپرٹی پورٹل)۔ بتائیں آپ کیا کرنا چاہتے ہیں:',
    offHours:
      'ہم آف آورز ہیں (22:00–06:00 Europe/Rome)۔ ایک آپریٹر صبح جواب دے گا۔ اس دوران آپ منتخب کر سکتے ہیں:',
    bookViewing:
      'وزٹ بک کرنے کے لیے اشتہار یا شہر لکھیں۔ ایک آپریٹر WhatsApp پر جواب دے گا۔',
    searchBrief:
      'شہر اور قیمت کی حد لکھیں (تلاش کی ترجیح، آفر نہیں)۔ ایک آپریٹر یہاں جواب دے گا۔',
    openListings: 'EasyCasa پورٹل پر اشتہارات دیکھ سکتے ہیں۔',
    briefThanks: 'شکریہ۔ تلاش کی ترجیح محفوظ ہو گئی۔ ایک آپریٹر WhatsApp پر جواب دے گا۔',
  },
  hi: {
    languageListBody: LANGUAGE_LIST_BODY,
    languageListButton: 'भाषा',
    languageNudge: 'भाषा चुनने के लिए सूची से एक विकल्प छुएँ।',
    welcome:
      'नमस्ते — यह EasyCasa WhatsApp चैनल है (प्रॉपर्टी पोर्टल)। बताएँ आप क्या करना चाहते हैं:',
    offHours:
      'हम ऑफ-आवर्स हैं (22:00–06:00 Europe/Rome)। एक व्यक्ति सुबह जवाब देगा। तब तक चुन सकते हैं:',
    bookViewing:
      'विज़िट बुक करने के लिए लिस्टिंग या शहर लिखें। एक व्यक्ति WhatsApp पर जवाब देगा।',
    searchBrief:
      'शहर और कीमत-पट्टी लिखें (खोज वरीयता, ऑफ़र नहीं)। एक व्यक्ति यहाँ जवाब देगा।',
    openListings: 'EasyCasa पोर्टल पर लिस्टिंग देख सकते हैं।',
    briefThanks: 'धन्यवाद। खोज वरीयता सहेज ली। एक व्यक्ति WhatsApp पर जवाब देगा।',
  },
  pa: {
    languageListBody: LANGUAGE_LIST_BODY,
    languageListButton: 'Language',
    languageNudge: 'Tap a list option to choose your language (Punjabi).',
    welcome:
      'Sat sri akal — this is the EasyCasa WhatsApp channel (property listing portal). Choose what you want to do:',
    offHours:
      'We are outside hours (22:00–06:00 Europe/Rome). A person will reply in the morning. Meanwhile you can choose:',
    bookViewing:
      'To book a viewing, send the listing or the city. A person will reply on WhatsApp.',
    searchBrief:
      'Send the city and price band you are looking for (a search preference, not an offer). A person will reply here.',
    openListings: 'You can browse listings on the EasyCasa portal.',
    briefThanks: 'Thanks. We saved the search preference. A person will reply on WhatsApp.',
  },
  ar: {
    languageListBody: LANGUAGE_LIST_BODY,
    languageListButton: 'اللغة',
    languageNudge: 'اضغط خياراً من القائمة لاختيار اللغة.',
    welcome:
      'مرحباً — هذه قناة واتساب EasyCasa (بوابة إعلانات عقارية). اختر ما تريد فعله:',
    offHours:
      'نحن خارج الدوام (22:00–06:00 Europe/Rome). سيرد شخص صباحاً. يمكنك الاختيار الآن:',
    bookViewing:
      'لحجز زيارة، أرسل الإعلان أو المدينة. سيرد شخص على واتساب.',
    searchBrief:
      'أرسل المدينة ونطاق السعر (تفضيل بحث، وليست عرضاً). سيرد شخص هنا.',
    openListings: 'يمكنك تصفح الإعلانات على بوابة EasyCasa.',
    briefThanks: 'شكراً. حفظنا تفضيل البحث. سيرد شخص على واتساب.',
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
  fr: [
    { id: JOURNEY_BUTTON_IDS.bookViewing, title: 'Réserver visite' },
    { id: JOURNEY_BUTTON_IDS.searchBrief, title: 'Recherche' },
    { id: JOURNEY_BUTTON_IDS.openListings, title: 'Voir annonces' },
  ],
  de: [
    { id: JOURNEY_BUTTON_IDS.bookViewing, title: 'Besichtigung' },
    { id: JOURNEY_BUTTON_IDS.searchBrief, title: 'Suche' },
    { id: JOURNEY_BUTTON_IDS.openListings, title: 'Inserate' },
  ],
  pt: [
    { id: JOURNEY_BUTTON_IDS.bookViewing, title: 'Marcar visita' },
    { id: JOURNEY_BUTTON_IDS.searchBrief, title: 'O que procura' },
    { id: JOURNEY_BUTTON_IDS.openListings, title: 'Ver anúncios' },
  ],
  ur: [
    { id: JOURNEY_BUTTON_IDS.bookViewing, title: 'وزٹ بک کریں' },
    { id: JOURNEY_BUTTON_IDS.searchBrief, title: 'تلاش' },
    { id: JOURNEY_BUTTON_IDS.openListings, title: 'اشتہارات' },
  ],
  hi: [
    { id: JOURNEY_BUTTON_IDS.bookViewing, title: 'विज़िट बुक करें' },
    { id: JOURNEY_BUTTON_IDS.searchBrief, title: 'खोज' },
    { id: JOURNEY_BUTTON_IDS.openListings, title: 'लिस्टिंग' },
  ],
  pa: [
    { id: JOURNEY_BUTTON_IDS.bookViewing, title: 'Book viewing' },
    { id: JOURNEY_BUTTON_IDS.searchBrief, title: 'Search pref.' },
    { id: JOURNEY_BUTTON_IDS.openListings, title: 'Open listings' },
  ],
  ar: [
    { id: JOURNEY_BUTTON_IDS.bookViewing, title: 'احجز زيارة' },
    { id: JOURNEY_BUTTON_IDS.searchBrief, title: 'تفضيل البحث' },
    { id: JOURNEY_BUTTON_IDS.openListings, title: 'فتح الإعلانات' },
  ],
};

/** Meta list: 10 rows max, title ≤24, description ≤72. */
const LANGUAGES: JourneyCopy['languages'] = [
  { id: 'lang_it', title: 'Italiano', description: 'IT' },
  { id: 'lang_en', title: 'English', description: 'EN' },
  { id: 'lang_es', title: 'Español', description: 'ES' },
  { id: 'lang_fr', title: 'Français', description: 'FR' },
  { id: 'lang_de', title: 'Deutsch', description: 'DE' },
  { id: 'lang_pt', title: 'Português', description: 'PT' },
  { id: 'lang_ur', title: 'اردو', description: 'Urdu' },
  { id: 'lang_hi', title: 'हिन्दी', description: 'Hindi' },
  { id: 'lang_pa', title: 'ਪੰਜਾਬੀ', description: 'Punjabi' },
  { id: 'lang_ar', title: 'العربية', description: 'Arabic' },
];

export function journeyCopy(locale: JourneyLocale): JourneyCopy {
  return {
    ...COPY[locale],
    buttons: BUTTONS[locale],
    languages: LANGUAGES,
  };
}
