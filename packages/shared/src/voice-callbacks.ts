/**
 * EC-CALLBACKS-1 — voice callback vocabulary and caller-facing copy.
 * Contact handling only. No offer, no financing, no auction-file fields.
 */

export const EASY_CASA_VOICE_E164 = '+393793306605';

/** Seeded Team queue. People are added in admin, not in this seed. */
export const CALLBACK_TEAM_QUEUE_ID = 'a11ce000-0000-4000-8000-0000000000c1';

export const CALLBACK_LANGUAGES = [
  'it',
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'ur',
  'hi',
  'pa',
  'bn',
  'ar',
] as const;

export type CallbackLanguage = (typeof CALLBACK_LANGUAGES)[number];

export const CALLBACK_TOPICS = ['EasyCasa', 'EasyLegenda', 'Other'] as const;
export type CallbackTopic = (typeof CALLBACK_TOPICS)[number];

export const CALLBACK_ROLES = ['buyer', 'seller', 'auction', 'info'] as const;
export type CallbackRole = (typeof CALLBACK_ROLES)[number];

export const CALLBACK_STATUSES = [
  'requested',
  'held',
  'confirmed',
  'done',
  'no_answer',
  'cancelled',
] as const;
export type CallbackStatus = (typeof CALLBACK_STATUSES)[number];

export const CONFIRM_WITHIN = ['2h', '4h', '1d'] as const;
export type ConfirmWithin = (typeof CONFIRM_WITHIN)[number];

export type CallbackLine = 'easy_casa' | 'easy_legenda';

/** CRM contact retention. Voice rows are scrubbed with the contact. No audio is stored. */
export const CALLBACK_LOG_RETENTION =
  'Voice-call summaries and callback rows stay with the CRM contact and are scrubbed when that contact is anonymised (CRM_DORMANT_RETENTION_MONTHS, default 24). No transcript and no audio are stored.';

const LANGUAGE_LABEL: Record<CallbackLanguage, string> = {
  it: 'IT',
  en: 'EN',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  pt: 'PT',
  ur: 'UR',
  hi: 'HI',
  pa: 'PA',
  bn: 'BN',
  ar: 'AR',
};

export function callbackLanguageLabel(language: CallbackLanguage): string {
  return LANGUAGE_LABEL[language];
}

/** Empty, other, ro, ru and anything unknown become Italian. */
export function normalizeCallbackLanguage(raw: string | null | undefined): CallbackLanguage {
  const value = (raw ?? '').trim().toLowerCase();
  if ((CALLBACK_LANGUAGES as readonly string[]).includes(value)) return value as CallbackLanguage;
  return 'it';
}

export function topicToLine(topic: CallbackTopic): CallbackLine {
  return topic === 'EasyLegenda' ? 'easy_legenda' : 'easy_casa';
}

export function lineLabel(line: CallbackLine): string {
  return line === 'easy_legenda' ? 'Easy Legenda' : 'Easy Casa';
}

export function roleLabel(role: CallbackRole): string {
  switch (role) {
    case 'buyer':
      return 'Buyer';
    case 'seller':
      return 'Seller';
    case 'auction':
      return 'Auction';
    default:
      return 'Info';
  }
}

/** CRM contacts.locale is it | en | es. Other call languages stay on the callback row. */
export function crmLocaleForCallback(language: CallbackLanguage): 'it' | 'en' | 'es' {
  if (language === 'en' || language === 'es' || language === 'it') return language;
  return 'it';
}

const SIGN_OFF = 'Easy Casa Italia · Ayni Group Italia';

/**
 * Existing EC Consult clause for languages other than it/en/es:
 * the site and Easy Legenda reports are in Italian, English or Spanish.
 */
const REPORTS_CLAUSE: Record<Exclude<CallbackLanguage, 'it' | 'en' | 'es'>, string> = {
  fr: 'Le site et les rapports Easy Legenda sont en italien, anglais ou espagnol.',
  de: 'Die Website und die Easy-Legenda-Berichte sind auf Italienisch, Englisch oder Spanisch.',
  pt: 'O site e os relatórios Easy Legenda estão em italiano, inglês ou espanhol.',
  ur: 'ویب سائٹ اور Easy Legenda کی رپورٹیں اطالوی، انگریزی یا ہسپانوی میں ہیں۔',
  hi: 'वेबसाइट और Easy Legenda की रिपोर्ट इतालवी, अंग्रेज़ी या स्पेनिश में हैं।',
  pa: 'ویبسائٹ تے Easy Legenda دیاں رپورٹاں اطالوی، انگریزی یا ہسپانوی وچ نیں۔',
  bn: 'ওয়েবসাইট এবং Easy Legenda-র রিপোর্ট ইতালীয়, ইংরেজি বা স্প্যানিশ ভাষায়।',
  ar: 'الموقع وتقارير Easy Legenda بالإيطالية أو الإنجليزية أو الإسبانية.',
};

function withClause(language: CallbackLanguage, body: string): string {
  if (language === 'it' || language === 'en' || language === 'es') return `${body}\n${SIGN_OFF}`;
  return `${body}\n${REPORTS_CLAUSE[language]}\n${SIGN_OFF}`;
}

const ACK: Record<CallbackLanguage, string> = {
  it: 'Abbiamo ricevuto la richiesta di essere richiamato. L’orario non è ancora confermato: una persona del team confermerà l’orario.',
  en: 'We received the request for a callback. The time is not confirmed yet: a person on the team will confirm the time.',
  es: 'Hemos recibido la solicitud de que le llamemos. La hora aún no está confirmada: una persona del equipo confirmará la hora.',
  fr: 'Nous avons reçu la demande de rappel. L’horaire n’est pas encore confirmé : une personne de l’équipe confirmera l’horaire.',
  de: 'Wir haben die Bitte um einen Rückruf erhalten. Die Uhrzeit ist noch nicht bestätigt: eine Person im Team bestätigt die Uhrzeit.',
  pt: 'Recebemos o pedido de retorno. O horário ainda não está confirmado: uma pessoa da equipa confirmará o horário.',
  ur: 'ہمیں واپسی کال کی درخواست مل گئی ہے۔ وقت ابھی تصدیق شدہ نہیں: ٹیم کا ایک فرد وقت کی تصدیق کرے گا۔',
  hi: 'हमें कॉल-बैक का अनुरोध मिल गया है। समय अभी पक्का नहीं है: टीम का एक व्यक्ति समय की पुष्टि करेगा।',
  pa: 'سانوں واپسی کال دی درخواست مل گئی اے۔ ویلہ ہالے پکا نہیں: ٹیم دا اک بندہ ویلے دی تصدیق کرے گا۔',
  bn: 'আমরা কলব্যাকের অনুরোধ পেয়েছি। সময় এখনও নিশ্চিত নয়: দলের একজন মানুষ সময় নিশ্চিত করবেন।',
  ar: 'وصلنا طلب معاودة الاتصال. الوقت غير مؤكد بعد: سيؤكد أحد أفراد الفريق الوقت.',
};

const CONFIRM: Record<CallbackLanguage, (when: string) => string> = {
  it: (when) => `La richiamiamo ${when} (ora di Roma).`,
  en: (when) => `We will call you back ${when} (Rome time).`,
  es: (when) => `Le llamamos ${when} (hora de Roma).`,
  fr: (when) => `Nous vous rappelons ${when} (heure de Rome).`,
  de: (when) => `Wir rufen Sie ${when} zurück (Uhrzeit Rom).`,
  pt: (when) => `Ligamos de volta ${when} (hora de Roma).`,
  ur: (when) => `ہم آپ کو ${when} واپس کال کریں گے (روم کا وقت)۔`,
  hi: (when) => `हम आपको ${when} वापस कॉल करेंगे (रोम का समय)।`,
  pa: (when) => `اسیں تہانوں ${when} واپس کال کراں گے (روم دا ویلہ)।`,
  bn: (when) => `আমরা আপনাকে ${when} ফোন করব (রোমের সময়)।`,
  ar: (when) => `نتصل بك ${when} (توقيت روما).`,
};

export function callbackAckMessage(language: CallbackLanguage): string {
  return withClause(language, ACK[language]);
}

export function callbackConfirmMessage(language: CallbackLanguage, whenLabel: string): string {
  return withClause(language, CONFIRM[language](whenLabel));
}

export function callbackOwnerAlert(input: {
  name: string;
  phone: string;
  language: CallbackLanguage;
  line: string;
  role: string;
  words: string;
  summary: string;
  link: string;
}): { subject: string; text: string } {
  const subject = `Callback · ${input.name} · ${input.language} · ${input.line}`;
  const text = [
    input.name,
    input.phone,
    `Language: ${input.language}`,
    `Line: ${input.line}`,
    `Role: ${input.role}`,
    `Caller said: “${input.words}”`,
    input.summary,
    input.link,
  ].join('\n');
  return { subject, text };
}

/**
 * Banned tokens for caller-facing callback copy.
 * Per-locale lists. The scanner also rejects % and euro amounts.
 */
export const CALLBACK_BANNED_TERMS: Record<CallbackLanguage, readonly string[]> = {
  it: [
    'agenzia',
    'mediatore',
    'mediazione',
    'provvigione',
    'commissione',
    'mutuo',
    'finanziamento',
    'ti troviamo',
    'troviamo una casa',
    'contattiamo il venditore',
    'mettiamo in contatto',
    'prezzo',
    'percentuale',
  ],
  en: [
    'agency',
    'mortgage',
    'financing',
    'commission',
    'find you a house',
    'we find you',
    'contact the seller',
    'put you in contact',
    'price',
    'percentage',
  ],
  es: [
    'agencia',
    'hipoteca',
    'financiación',
    'financiacion',
    'comisión',
    'comision',
    'te encontramos una casa',
    'contactamos al vendedor',
    'te ponemos en contacto',
    'precio',
    'porcentaje',
  ],
  fr: [
    'agence',
    'hypothèque',
    'hypotheque',
    'financement',
    'commission',
    'nous vous trouvons',
    'contactons le vendeur',
    'mettons en contact',
    'prix',
    'pourcentage',
  ],
  de: [
    'agentur',
    'hypothek',
    'finanzierung',
    'provision',
    'wir finden ihnen',
    'kontaktieren den verkäufer',
    'vermitteln',
    'preis',
    'prozent',
  ],
  pt: [
    'agência',
    'agencia',
    'hipoteca',
    'financiamento',
    'comissão',
    'comissao',
    'encontramos uma casa',
    'contactamos o vendedor',
    'pomos em contacto',
    'preço',
    'preco',
    'percentagem',
  ],
  ur: ['ایجنسی', 'رہن', 'قرض', 'کمیشن', 'فیصد', 'قیمت', 'agency', 'mortgage'],
  hi: ['एजेंसी', 'ऋण', 'कर्ज', 'कमीशन', 'प्रतिशत', 'कीमत', 'agency', 'mortgage'],
  pa: ['ایجنسی', 'رہن', 'قرض', 'کمیشن', 'فیصد', 'agency', 'mortgage'],
  bn: ['এজেন্সি', 'বন্ধক', 'ঋণ', 'কমিশন', 'শতাংশ', 'দাম', 'agency', 'mortgage'],
  ar: ['وكالة', 'رهن', 'تمويل', 'عمولة', 'نسبة', 'سعر', 'agency', 'mortgage'],
};

export function scanCallbackCopy(language: CallbackLanguage, text: string): string[] {
  const hay = text.toLowerCase();
  const hits = CALLBACK_BANNED_TERMS[language].filter((term) => hay.includes(term.toLowerCase()));
  if (/%/.test(text) || /€\s*\d|\d+\s*€/.test(text)) hits.push('amount-or-percent');
  return hits;
}

export function allCallbackCopy(language: CallbackLanguage): string[] {
  return [callbackAckMessage(language), callbackConfirmMessage(language, 'lunedì 10:00')];
}
