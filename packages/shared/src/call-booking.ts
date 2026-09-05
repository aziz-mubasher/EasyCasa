import { normalizeProvinceSlug, PROVINCE_BY_SLUG } from './italian-geography';

/**
 * Closed reasons for a staff callback. T04 rows 10–12 stay out:
 * no offer / proposta / negotiation / credit-intake reasons.
 */
export const CALL_BOOKING_REASONS = [
  'sell',
  'buy',
  'legenda',
  'assistito',
  'other',
] as const;

export type CallBookingReason = (typeof CALL_BOOKING_REASONS)[number];

export const CALL_BOOKING_PATH = '/prenota-chiamata';

/** Human URL slugs (IT-first). Canonical reason id is still `sell` / `buy` / … */
export const CALL_REASON_SLUG: Readonly<Record<CallBookingReason, string>> = {
  sell: 'vendere',
  buy: 'comprare',
  legenda: 'easy-legenda',
  assistito: 'acquisto-assistito',
  other: 'altro',
};

const REASON_ALIASES: Readonly<Record<string, CallBookingReason>> = {
  sell: 'sell',
  vendere: 'sell',
  selling: 'sell',
  sell_property: 'sell',
  buy: 'buy',
  comprare: 'buy',
  buying: 'buy',
  buy_property: 'buy',
  legenda: 'legenda',
  'easy-legenda': 'legenda',
  easy_legenda: 'legenda',
  aste: 'legenda',
  auction: 'legenda',
  assistito: 'assistito',
  'acquisto-assistito': 'assistito',
  acquisto_assistito: 'assistito',
  foreign: 'assistito',
  other: 'other',
  altro: 'other',
  otra: 'other',
};

export function isCallBookingReason(value: string): value is CallBookingReason {
  return (CALL_BOOKING_REASONS as readonly string[]).includes(value);
}

export function parseCallBookingReason(raw: string | null | undefined): CallBookingReason | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/\s+/g, '-');
  return REASON_ALIASES[key] ?? null;
}

export function callReasonSlug(reason: CallBookingReason): string {
  return CALL_REASON_SLUG[reason];
}

export function provinceDisplayName(raw: string | null | undefined): string | null {
  const slug = normalizeProvinceSlug(raw);
  if (!slug) return null;
  return PROVINCE_BY_SLUG.get(slug)?.name ?? slug;
}

export const CALL_BOOKING_LOCALES = ['it', 'en', 'es', 'ur', 'hi'] as const;
export type CallBookingLocale = (typeof CALL_BOOKING_LOCALES)[number];

export const CALL_BOOKING_LOCALE_LABEL: Readonly<Record<CallBookingLocale, string>> = {
  it: 'IT — Italiano',
  en: 'EN — English',
  es: 'ES — Español',
  ur: 'UR — اردو',
  hi: 'HI — हिन्दी',
};

const CALL_BOOKING_LOCALE_SET = new Set<string>(CALL_BOOKING_LOCALES);

export function isCallBookingLocale(value: string | null | undefined): value is CallBookingLocale {
  return !!value && CALL_BOOKING_LOCALE_SET.has(value);
}

export function parseCallBookingLocale(raw: string | null | undefined): CallBookingLocale {
  if (isCallBookingLocale(raw)) return raw;
  return 'it';
}

export function callBookingTextDirection(locale: CallBookingLocale): 'ltr' | 'rtl' {
  return locale === 'ur' ? 'rtl' : 'ltr';
}

export function buildCallBookingPath(input: {
  locale?: CallBookingLocale;
  province: string;
  reason: CallBookingReason;
}): string {
  const locale = input.locale ?? 'it';
  const slug = normalizeProvinceSlug(input.province);
  if (!slug) {
    throw new Error('unknown province');
  }
  const name = PROVINCE_BY_SLUG.get(slug)?.name ?? slug;
  const q = new URLSearchParams({
    provincia: name,
    motivo: CALL_REASON_SLUG[input.reason],
  });
  return `/${locale}${CALL_BOOKING_PATH}?${q.toString()}`;
}

export function buildCallBookingUrl(input: {
  origin: string;
  locale?: CallBookingLocale;
  province: string;
  reason: CallBookingReason;
}): string {
  const origin = input.origin.replace(/\/$/, '');
  return `${origin}${buildCallBookingPath(input)}`;
}

export function parseCallBookingQuery(search: {
  provincia?: string | null;
  province?: string | null;
  motivo?: string | null;
  reason?: string | null;
}): { province: string | null; reason: CallBookingReason | null; provinceName: string | null } {
  const province = normalizeProvinceSlug(search.provincia ?? search.province ?? null);
  const reason = parseCallBookingReason(search.motivo ?? search.reason ?? null);
  return {
    province,
    reason,
    provinceName: provinceDisplayName(province),
  };
}

export function callBookingTaskTitle(input: {
  provinceName: string;
  reasonLabel: string;
}): string {
  return `Call · ${input.provinceName} · ${input.reasonLabel}`;
}

export const CALL_REASON_LABELS: Readonly<
  Record<CallBookingLocale, Record<CallBookingReason, string>>
> = {
  it: {
    sell: 'Vendita immobile',
    buy: 'Acquisto immobile',
    legenda: 'Easy Legenda / aste',
    assistito: 'Acquisto Assistito',
    other: 'Altro',
  },
  en: {
    sell: 'Selling a property',
    buy: 'Buying a property',
    legenda: 'Easy Legenda / auctions',
    assistito: 'Assisted purchase',
    other: 'Something else',
  },
  es: {
    sell: 'Vender un inmueble',
    buy: 'Comprar un inmueble',
    legenda: 'Easy Legenda / subastas',
    assistito: 'Compra asistida',
    other: 'Otro',
  },
  ur: {
    sell: 'جائیداد فروخت',
    buy: 'جائیداد خریداری',
    legenda: 'Easy Legenda / نیلامی',
    assistito: 'معاون خریداری',
    other: 'دیگر',
  },
  hi: {
    sell: 'संपत्ति बेचना',
    buy: 'संपत्ति खरीदना',
    legenda: 'Easy Legenda / नीलामी',
    assistito: 'सहायता प्राप्त खरीद',
    other: 'कुछ और',
  },
};

export function callReasonLabel(reason: CallBookingReason, locale: CallBookingLocale): string {
  return CALL_REASON_LABELS[locale][reason];
}

/** Default due time when the visitor does not pick a slot: +24h. */
export function defaultCallDueAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + 24 * 60 * 60 * 1000);
}

export function resolveCallDueAt(preferredAt: string | null | undefined, from: Date = new Date()): Date {
  if (preferredAt) {
    const parsed = new Date(preferredAt);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > from.getTime()) {
      return parsed;
    }
  }
  return defaultCallDueAt(from);
}

/** Greeting + 15-minute discovery-call body. Same pattern in every desk language. */
export const CALL_BOOKING_INVITE_GREETING: Readonly<Record<CallBookingLocale, string>> = {
  it: 'Ciao',
  en: 'Hello',
  es: 'Hola',
  ur: 'Salam o alaikum',
  hi: 'Namaste',
};

export const CALL_BOOKING_INVITE_BODY: Readonly<Record<CallBookingLocale, string>> = {
  it: 'Prenota con noi una chiamata di scoperta di 15 minuti nella tua lingua. Clicca qui sotto per scegliere il giorno e l’orario che preferisci. La conferma arriverà su WhatsApp e via e-mail.',
  en: 'Book a 15-minute discovery call with us in your language. Click below to choose your preferred day and time. Confirmation will be sent on WhatsApp and by email.',
  es: 'Reserva con nosotros una llamada de descubrimiento de 15 minutos en tu idioma. Haz clic abajo para elegir el día y la hora. La confirmación se enviará por WhatsApp y por correo.',
  ur: 'اپنی زبان میں ہمارے ساتھ 15 منٹ کی دریافت کال بک کریں۔ اپنا پسندیدہ دن اور وقت منتخب کرنے کے لیے نیچے کلک کریں۔ تصدیق واٹس ایپ اور ای میل کے ذریعے بھیجی جائے گی۔',
  hi: 'अपनी भाषा में हमारे साथ 15 मिनट की डिस्कवरी कॉल बुक करें। पसंदीदा दिन और समय चुनने के लिए नीचे क्लिक करें। पुष्टि WhatsApp और ईमेल से भेजी जाएगी।',
};

export function callBookingInviteName(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'name';
}

/** WhatsApp / email invitation EC Consult pastes when sending a shareable slot link. */
export function buildCallBookingInvite(input: {
  locale: CallBookingLocale;
  name?: string | null;
  url: string;
}): string {
  const who = callBookingInviteName(input.name);
  const greeting = `${CALL_BOOKING_INVITE_GREETING[input.locale]}, ${who}`;
  return `${greeting}\n${CALL_BOOKING_INVITE_BODY[input.locale]}\n${input.url}`;
}

/** Public form copy for desk locales that are not full site locales (ur / hi). */
export type CallBookingUiCopy = {
  meta: { title: string; description: string };
  eyebrow: string;
  title: string;
  lead: string;
  notAdvice: string;
  fields: {
    name: string;
    email: string;
    phone: string;
    province: string;
    provinceNone: string;
    reason: string;
    reasonNone: string;
    when: string;
    whenHint: string;
  };
  consent: { before: string; privacy: string; after: string };
  submit: string;
  submitting: string;
  success: { title: string; body: string };
  errors: { required: string; submit: string };
};

export const CALL_BOOKING_UI: Readonly<Record<'ur' | 'hi', CallBookingUiCopy>> = {
  ur: {
    meta: {
      title: 'کال بک کریں — EasyCasa',
      description: 'اپنی زبان میں 15 منٹ کی دریافت کال بک کریں۔ تصدیق واٹس ایپ اور ای میل پر آئے گی۔',
    },
    eyebrow: 'دریافت کال',
    title: '15 منٹ کی دریافت کال بک کریں',
    lead: 'اپنی زبان میں ہمارے ساتھ 15 منٹ کی دریافت کال بک کریں۔ اپنا پسندیدہ دن اور وقت منتخب کریں۔ تصدیق واٹس ایپ اور ای میل کے ذریعے بھیجی جائے گی۔',
    notAdvice: 'یہ دلالی نہیں: ہم آفر نہیں لیتے، تجویز نہیں لکھتے، اور قیمت تجویز نہیں کرتے۔',
    fields: {
      name: 'پورا نام',
      email: 'ای میل',
      phone: 'فون',
      province: 'صوبہ',
      provinceNone: 'صوبہ منتخب کریں',
      reason: 'کال کی وجہ',
      reasonNone: 'وجہ منتخب کریں',
      when: 'پسندیدہ وقت (اختیاری)',
      whenHint: 'اگر خالی چھوڑیں تو ہم 24 گھنٹے میں کال کریں گے۔',
    },
    consent: {
      before: 'میں نے ',
      privacy: 'رازداری نوٹس',
      after: ' پڑھ لیا ہے اور اس درخواست پر کال بیک چاہتا/چاہتی ہوں۔',
    },
    submit: 'کال کی درخواست بھیجیں',
    submitting: 'بھیجا جا رہا ہے…',
    success: {
      title: 'درخواست مل گئی',
      body: 'ہم آپ کے نمبر پر کال کریں گے۔ اگر وقت چنا ہے تو وہی رکھیں گے؛ ورنہ 24 گھنٹے میں۔',
    },
    errors: {
      required: 'لازمی خانے بھریں اور رازداری نوٹس قبول کریں۔',
      submit: 'نہیں بھیج سکے۔ دوبارہ کوشش کریں یا WhatsApp پر لکھیں۔',
    },
  },
  hi: {
    meta: {
      title: 'कॉल बुक करें — EasyCasa',
      description: 'अपनी भाषा में 15 मिनट की डिस्कवरी कॉल बुक करें। पुष्टि WhatsApp और ईमेल पर आएगी।',
    },
    eyebrow: 'डिस्कवरी कॉल',
    title: '15 मिनट की डिस्कवरी कॉल बुक करें',
    lead: 'अपनी भाषा में हमारे साथ 15 मिनट की डिस्कवरी कॉल बुक करें। पसंदीदा दिन और समय चुनें। पुष्टि WhatsApp और ईमेल से भेजी जाएगी।',
    notAdvice: 'यह दलाली नहीं है: हम ऑफ़र नहीं लेते, प्रस्ताव नहीं लिखते, और कीमत नहीं सुझाते।',
    fields: {
      name: 'पूरा नाम',
      email: 'ईमेल',
      phone: 'फ़ोन',
      province: 'प्रांत',
      provinceNone: 'प्रांत चुनें',
      reason: 'कॉल का कारण',
      reasonNone: 'कारण चुनें',
      when: 'पसंदीदा समय (वैकल्पिक)',
      whenHint: 'खाली छोड़ने पर हम 24 घंटे में कॉल करेंगे।',
    },
    consent: {
      before: 'मैंने ',
      privacy: 'गोपनीयता सूचना',
      after: ' पढ़ ली है और इस अनुरोध पर कॉलबैक चाहता/चाहती हूँ।',
    },
    submit: 'कॉल की विनती भेजें',
    submitting: 'भेजा जा रहा है…',
    success: {
      title: 'विनती मिल गई',
      body: 'हम आपके नंबर पर कॉल करेंगे। समय चुना हो तो वही रखेंगे; नहीं तो 24 घंटे में।',
    },
    errors: {
      required: 'ज़रूरी फ़ील्ड भरें और गोपनीयता सूचना स्वीकार करें।',
      submit: 'नहीं भेज सके। फिर कोशिश करें या WhatsApp पर लिखें।',
    },
  },
};
