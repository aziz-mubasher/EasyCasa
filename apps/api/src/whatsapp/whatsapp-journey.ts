/**
 * K EC 7.4 / K EC 7.4b — first-contact templates agent (B4A order, EC copy).
 * Language list is the B4A WhatsApp ice-breaker set (10 rows = Meta list max).
 * Welcome / buttons stay estate-agency (buy / sell / Easy Legenda).
 * No Assist / Consult / FAQ. No credit journeys.
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

/** New EC ids — never reuse B4A credit button ids. Legacy ids stay for in-flight taps. */
export const JOURNEY_BUTTON_IDS = {
  buyProperty: 'buy_property',
  sellProperty: 'sell_property',
  easyLegenda: 'easy_legenda',
  bookViewing: 'book_viewing',
  searchBrief: 'search_brief',
  openListings: 'open_listings',
} as const;

export const JOURNEY_LEGENDA_URL = 'https://legenda.easycasaita.com';

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
  | { type: 'buy_property'; locale: JourneyLocale }
  | { type: 'sell_property'; locale: JourneyLocale }
  | { type: 'easy_legenda'; locale: JourneyLocale }
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

export function isJourneyButtonId(id: string | null | undefined): boolean {
  if (!id) return false;
  return (Object.values(JOURNEY_BUTTON_IDS) as string[]).includes(id);
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
    const id = inbound.interactiveId;
    if (id === JOURNEY_BUTTON_IDS.buyProperty) return { type: 'buy_property', locale };
    if (id === JOURNEY_BUTTON_IDS.sellProperty) return { type: 'sell_property', locale };
    if (id === JOURNEY_BUTTON_IDS.easyLegenda) return { type: 'easy_legenda', locale };
    if (id === JOURNEY_BUTTON_IDS.bookViewing) return { type: 'book_viewing', locale };
    if (id === JOURNEY_BUTTON_IDS.searchBrief) return { type: 'search_brief', locale };
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
  buyProperty: string;
  sellProperty: string;
  easyLegenda: string;
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
    welcome: 'Ciao — questo è il canale WhatsApp di EasyCasa Italia. Scegli cosa vuoi fare:',
    offHours:
      'Siamo fuori orario (22:00–06:00 Europe/Rome). Un operatore risponderà in mattinata. Nel frattempo puoi scegliere:',
    buyProperty:
      'EasyCasa Italia è la piattaforma per comprare casa in Italia. Cerca gli annunci sul sito — un operatore ti risponderà qui se vuoi aiuto.',
    sellProperty:
      'Puoi pubblicare un immobile dal sito EasyCasa Italia. Un operatore ti risponderà qui per iniziare.',
    easyLegenda:
      'Easy Legenda (Asta) legge il fascicolo — perizia, ordinanza, avviso di vendita — e spiega cosa c’è dentro. Il primo fascicolo è gratuito.',
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
    welcome: 'Hi — this is the EasyCasa Italia WhatsApp channel. Choose what you want to do:',
    offHours:
      'We are outside hours (22:00–06:00 Europe/Rome). A person will reply in the morning. Meanwhile you can choose:',
    buyProperty:
      'EasyCasa Italia is the platform for buying a home in Italy. Search listings on the site — a person will reply here if you want help.',
    sellProperty:
      'You can list a property from the EasyCasa Italia site. A person will reply here to help you get started.',
    easyLegenda:
      'Easy Legenda (Asta) reads the court file — perizia, ordinanza, avviso di vendita — and explains what’s in it. The first file is free.',
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
    welcome: 'Hola — este es el canal WhatsApp de EasyCasa Italia. Elige qué quieres hacer:',
    offHours:
      'Estamos fuera de horario (22:00–06:00 Europe/Rome). Una persona responderá por la mañana. Mientras tanto puedes elegir:',
    buyProperty:
      'EasyCasa Italia es la plataforma para comprar vivienda en Italia. Busque anuncios en el sitio — una persona responderá aquí si quiere ayuda.',
    sellProperty:
      'Puede publicar un inmueble desde el sitio EasyCasa Italia. Una persona responderá aquí para empezar.',
    easyLegenda:
      'Easy Legenda (Asta) lee el expediente — perizia, ordinanza, avviso di vendita — y explica qué contiene. El primer expediente es gratuito.',
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
    welcome: 'Bonjour — ceci est le canal WhatsApp EasyCasa Italia. Choisissez ce que vous voulez faire :',
    offHours:
      'Nous sommes hors horaires (22:00–06:00 Europe/Rome). Une personne répondra le matin. En attendant vous pouvez choisir :',
    buyProperty:
      'EasyCasa Italia est la plateforme pour acheter un bien en Italie. Consultez les annonces sur le site — une personne répondra ici si vous voulez de l’aide.',
    sellProperty:
      'Vous pouvez déposer un bien depuis le site EasyCasa Italia. Une personne répondra ici pour vous aider à commencer.',
    easyLegenda:
      'Easy Legenda (Asta) lit le dossier — perizia, ordinanza, avviso di vendita — et explique ce qu’il contient. Le premier dossier est gratuit.',
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
    welcome: 'Hallo — das ist der EasyCasa Italia-WhatsApp-Kanal. Wählen Sie, was Sie tun möchten:',
    offHours:
      'Wir sind außerhalb der Zeiten (22:00–06:00 Europe/Rome). Eine Person antwortet am Morgen. Bis dahin können Sie wählen:',
    buyProperty:
      'EasyCasa Italia ist die Plattform zum Immobilienkauf in Italien. Inserate finden Sie auf der Website — eine Person antwortet hier, wenn Sie Hilfe möchten.',
    sellProperty:
      'Sie können eine Immobilie auf der EasyCasa Italia-Website inserieren. Eine Person antwortet hier, um zu starten.',
    easyLegenda:
      'Easy Legenda (Asta) liest die Gerichtsakte — perizia, ordinanza, avviso di vendita — und erklärt den Inhalt. Die erste Akte ist kostenlos.',
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
    welcome: 'Olá — este é o canal WhatsApp da EasyCasa Italia. Escolha o que quer fazer:',
    offHours:
      'Estamos fora de horário (22:00–06:00 Europe/Rome). Uma pessoa responde de manhã. Entretanto pode escolher:',
    buyProperty:
      'A EasyCasa Italia é a plataforma para comprar casa em Itália. Veja os anúncios no site — uma pessoa responde aqui se quiser ajuda.',
    sellProperty:
      'Pode anunciar um imóvel no site EasyCasa Italia. Uma pessoa responde aqui para começar.',
    easyLegenda:
      'Easy Legenda (Asta) lê o processo — perizia, ordinanza, avviso di vendita — e explica o que contém. O primeiro processo é gratuito.',
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
    welcome: 'السلام علیکم — یہ EasyCasa Italia کا WhatsApp چینل ہے۔ بتائیں آپ کیا کرنا چاہتے ہیں:',
    offHours:
      'ہم آف آورز ہیں (22:00–06:00 Europe/Rome)۔ ایک آپریٹر صبح جواب دے گا۔ اس دوران آپ منتخب کر سکتے ہیں:',
    buyProperty:
      'EasyCasa Italia اٹلی میں گھر خریدنے کا پلیٹ فارم ہے۔ سائٹ پر اشتہارات دیکھیں — مدد چاہیے تو ایک آپریٹر یہاں جواب دے گا۔',
    sellProperty:
      'آپ EasyCasa Italia کی سائٹ سے مکان لسٹ کر سکتے ہیں۔ شروع کرنے کے لیے ایک آپریٹر یہاں جواب دے گا۔',
    easyLegenda:
      'Easy Legenda (Asta) عدالتی فائل پڑھتی ہے — perizia، ordinanza، avviso di vendita — اور بتاتی ہے اس میں کیا ہے۔ پہلی فائل مفت ہے۔',
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
    welcome: 'नमस्ते — यह EasyCasa Italia WhatsApp चैनल है। बताएँ आप क्या करना चाहते हैं:',
    offHours:
      'हम ऑफ-आवर्स हैं (22:00–06:00 Europe/Rome)। एक व्यक्ति सुबह जवाब देगा। तब तक चुन सकते हैं:',
    buyProperty:
      'EasyCasa Italia इटली में घर खरीदने का प्लेटफ़ॉर्म है। साइट पर लिस्टिंग देखें — मदद चाहिए तो एक व्यक्ति यहाँ जवाब देगा।',
    sellProperty:
      'आप EasyCasa Italia साइट से संपत्ति लिस्ट कर सकते हैं। शुरू करने के लिए एक व्यक्ति यहाँ जवाब देगा।',
    easyLegenda:
      'Easy Legenda (Asta) अदालती फ़ाइल पढ़ता है — perizia, ordinanza, avviso di vendita — और बताता है उसमें क्या है। पहली फ़ाइल मुफ़्त है।',
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
    welcome: 'Sat sri akal — this is the EasyCasa Italia WhatsApp channel. Choose what you want to do:',
    offHours:
      'We are outside hours (22:00–06:00 Europe/Rome). A person will reply in the morning. Meanwhile you can choose:',
    buyProperty:
      'EasyCasa Italia is the platform for buying a home in Italy. Search listings on the site — a person will reply here if you want help.',
    sellProperty:
      'You can list a property from the EasyCasa Italia site. A person will reply here to help you get started.',
    easyLegenda:
      'Easy Legenda (Asta) reads the court file — perizia, ordinanza, avviso di vendita — and explains what’s in it. The first file is free.',
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
    welcome: 'مرحباً — هذه قناة واتساب EasyCasa Italia. اختر ما تريد فعله:',
    offHours:
      'نحن خارج الدوام (22:00–06:00 Europe/Rome). سيرد شخص صباحاً. يمكنك الاختيار الآن:',
    buyProperty:
      'EasyCasa Italia منصة لشراء منزل في إيطاليا. تصفح الإعلانات على الموقع — وسيرد شخص هنا إذا أردت المساعدة.',
    sellProperty:
      'يمكنك إدراج عقار من موقع EasyCasa Italia. سيرد شخص هنا للمساعدة في البدء.',
    easyLegenda:
      'Easy Legenda (Asta) يقرأ ملف المحكمة — perizia و ordinanza و avviso di vendita — ويشرح ما فيه. الملف الأول مجاني.',
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
    { id: JOURNEY_BUTTON_IDS.buyProperty, title: 'Comprare casa' },
    { id: JOURNEY_BUTTON_IDS.sellProperty, title: 'Vendere casa' },
    { id: JOURNEY_BUTTON_IDS.easyLegenda, title: 'Easy Legenda (Asta)' },
  ],
  en: [
    { id: JOURNEY_BUTTON_IDS.buyProperty, title: 'Buying Property' },
    { id: JOURNEY_BUTTON_IDS.sellProperty, title: 'Selling Property' },
    { id: JOURNEY_BUTTON_IDS.easyLegenda, title: 'Easy Legenda (Asta)' },
  ],
  es: [
    { id: JOURNEY_BUTTON_IDS.buyProperty, title: 'Comprar vivienda' },
    { id: JOURNEY_BUTTON_IDS.sellProperty, title: 'Vender vivienda' },
    { id: JOURNEY_BUTTON_IDS.easyLegenda, title: 'Easy Legenda (Asta)' },
  ],
  fr: [
    { id: JOURNEY_BUTTON_IDS.buyProperty, title: 'Acheter un bien' },
    { id: JOURNEY_BUTTON_IDS.sellProperty, title: 'Vendre un bien' },
    { id: JOURNEY_BUTTON_IDS.easyLegenda, title: 'Easy Legenda (Asta)' },
  ],
  de: [
    { id: JOURNEY_BUTTON_IDS.buyProperty, title: 'Immobilie kaufen' },
    { id: JOURNEY_BUTTON_IDS.sellProperty, title: 'Immobilie verkaufen' },
    { id: JOURNEY_BUTTON_IDS.easyLegenda, title: 'Easy Legenda (Asta)' },
  ],
  pt: [
    { id: JOURNEY_BUTTON_IDS.buyProperty, title: 'Comprar imóvel' },
    { id: JOURNEY_BUTTON_IDS.sellProperty, title: 'Vender imóvel' },
    { id: JOURNEY_BUTTON_IDS.easyLegenda, title: 'Easy Legenda (Asta)' },
  ],
  ur: [
    { id: JOURNEY_BUTTON_IDS.buyProperty, title: 'پراپرٹی خریدیں' },
    { id: JOURNEY_BUTTON_IDS.sellProperty, title: 'پراپرٹی بیچیں' },
    { id: JOURNEY_BUTTON_IDS.easyLegenda, title: 'Easy Legenda (Asta)' },
  ],
  hi: [
    { id: JOURNEY_BUTTON_IDS.buyProperty, title: 'संपत्ति खरीदें' },
    { id: JOURNEY_BUTTON_IDS.sellProperty, title: 'संपत्ति बेचें' },
    { id: JOURNEY_BUTTON_IDS.easyLegenda, title: 'Easy Legenda (Asta)' },
  ],
  pa: [
    { id: JOURNEY_BUTTON_IDS.buyProperty, title: 'Buying Property' },
    { id: JOURNEY_BUTTON_IDS.sellProperty, title: 'Selling Property' },
    { id: JOURNEY_BUTTON_IDS.easyLegenda, title: 'Easy Legenda (Asta)' },
  ],
  ar: [
    { id: JOURNEY_BUTTON_IDS.buyProperty, title: 'شراء عقار' },
    { id: JOURNEY_BUTTON_IDS.sellProperty, title: 'بيع عقار' },
    { id: JOURNEY_BUTTON_IDS.easyLegenda, title: 'Easy Legenda (Asta)' },
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
