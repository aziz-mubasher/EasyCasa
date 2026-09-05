/**
 * Operator session-window replies for the EC WhatsApp inbox.
 * Five desk languages: IT / EN / ES + UR / HI.
 * T04 rows 4–5 only — no offer / proposta / caparra / negotiation / credit copy.
 */

import { buildCallBookingInvite } from './call-booking';

export const WA_OPERATOR_LOCALES = ['it', 'en', 'es', 'ur', 'hi'] as const;
export type WaOperatorLocale = (typeof WA_OPERATOR_LOCALES)[number];

export const WA_OPERATOR_LOCALE_LABEL: Readonly<Record<WaOperatorLocale, string>> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
  ur: 'اردو',
  hi: 'हिन्दी',
};

export const WA_OPERATOR_TEMPLATE_IDS = [
  'viewing',
  'search',
  'portal',
  'call',
  'legenda',
  'hours',
] as const;
export type WaOperatorTemplateId = (typeof WA_OPERATOR_TEMPLATE_IDS)[number];

export type WaOperatorTemplate = {
  id: WaOperatorTemplateId;
  /** Short chip label, per locale */
  title: Record<WaOperatorLocale, string>;
  body: Record<WaOperatorLocale, string>;
};

const PORTAL = 'https://easycasaita.com';
const LEGENDA = 'https://legenda.easycasaita.com';
const CALL: Record<WaOperatorLocale, string> = {
  it: `${PORTAL}/it/prenota-chiamata`,
  en: `${PORTAL}/en/prenota-chiamata`,
  es: `${PORTAL}/es/prenota-chiamata`,
  ur: `${PORTAL}/ur/prenota-chiamata`,
  hi: `${PORTAL}/hi/prenota-chiamata`,
};

function callInvite(locale: WaOperatorLocale, name?: string | null): string {
  return buildCallBookingInvite({ locale, name, url: CALL[locale] });
}

export const WA_OPERATOR_TEMPLATES: readonly WaOperatorTemplate[] = [
  {
    id: 'viewing',
    title: {
      it: 'Visita',
      en: 'Viewing',
      es: 'Visita',
      ur: 'وزٹ',
      hi: 'विज़िट',
    },
    body: {
      it: "Per prenotare una visita, indica l'annuncio o la città. Un operatore ti risponderà su WhatsApp.",
      en: 'To book a viewing, send the listing or the city. A person will reply on WhatsApp.',
      es: 'Para reservar una visita, indica el anuncio o la ciudad. Una persona te responderá en WhatsApp.',
      ur: 'وزٹ بک کرنے کے لیے اشتہار یا شہر لکھیں۔ ایک آپریٹر WhatsApp پر جواب دے گا۔',
      hi: 'विज़िट बुक करने के लिए लिस्टिंग या शहर लिखें। एक व्यक्ति WhatsApp पर जवाब देगा।',
    },
  },
  {
    id: 'search',
    title: {
      it: 'Ricerca',
      en: 'Search',
      es: 'Búsqueda',
      ur: 'تلاش',
      hi: 'खोज',
    },
    body: {
      it: "Scrivi città e fascia di prezzo che stai cercando (preferenza di ricerca, non un'offerta). Un operatore ti risponderà qui.",
      en: 'Send the city and price band you are looking for (a search preference, not an offer). A person will reply here.',
      es: 'Escribe ciudad y franja de precio que buscas (preferencia de búsqueda, no una oferta). Una persona te responderá aquí.',
      ur: 'شہر اور قیمت کی حد لکھیں (تلاش کی ترجیح، آفر نہیں)۔ ایک آپریٹر یہاں جواب دے گا۔',
      hi: 'शहर और कीमत-पट्टी लिखें (खोज वरीयता, ऑफ़र नहीं)। एक व्यक्ति यहाँ जवाब देगा।',
    },
  },
  {
    id: 'portal',
    title: {
      it: 'Portale',
      en: 'Portal',
      es: 'Portal',
      ur: 'پورٹل',
      hi: 'पोर्टल',
    },
    body: {
      it: `Puoi sfogliare gli annunci sul portale EasyCasa: ${PORTAL}`,
      en: `You can browse listings on the EasyCasa portal: ${PORTAL}`,
      es: `Puedes ver los anuncios en el portal EasyCasa: ${PORTAL}`,
      ur: `EasyCasa پورٹل پر اشتہارات دیکھ سکتے ہیں: ${PORTAL}`,
      hi: `EasyCasa पोर्टल पर लिस्टिंग देख सकते हैं: ${PORTAL}`,
    },
  },
  {
    id: 'call',
    title: {
      it: 'Chiamata',
      en: 'Call',
      es: 'Llamada',
      ur: 'کال',
      hi: 'कॉल',
    },
    body: {
      it: callInvite('it'),
      en: callInvite('en'),
      es: callInvite('es'),
      ur: callInvite('ur'),
      hi: callInvite('hi'),
    },
  },
  {
    id: 'legenda',
    title: {
      it: 'Legenda',
      en: 'Legenda',
      es: 'Legenda',
      ur: 'Legenda',
      hi: 'Legenda',
    },
    body: {
      it: `Easy Legenda (Asta) legge il fascicolo — perizia, ordinanza, avviso di vendita — e spiega cosa c’è dentro. Il primo fascicolo è gratuito: ${LEGENDA}`,
      en: `Easy Legenda (Asta) reads the court file — perizia, ordinanza, avviso di vendita — and explains what’s in it. The first file is free: ${LEGENDA}`,
      es: `Easy Legenda (Asta) lee el expediente — perizia, ordinanza, avviso di vendita — y explica qué contiene. El primer expediente es gratuito: ${LEGENDA}`,
      ur: `Easy Legenda (Asta) عدالتی فائل پڑھتی ہے — perizia، ordinanza، avviso di vendita — اور بتاتی ہے اس میں کیا ہے۔ پہلی فائل مفت ہے: ${LEGENDA}`,
      hi: `Easy Legenda (Asta) अदालती फ़ाइल पढ़ता है — perizia, ordinanza, avviso di vendita — और बताता है उसमें क्या है। पहली फ़ाइल मुफ़्त है: ${LEGENDA}`,
    },
  },
  {
    id: 'hours',
    title: {
      it: 'Orari',
      en: 'Hours',
      es: 'Horario',
      ur: 'اوقات',
      hi: 'समय',
    },
    body: {
      it: 'Un operatore risponde su WhatsApp dalle 06:00 alle 22:00 (Europe/Rome). Fuori orario ti rispondiamo in mattinata.',
      en: 'A person replies on WhatsApp from 06:00 to 22:00 (Europe/Rome). Outside those hours we reply in the morning.',
      es: 'Una persona responde en WhatsApp de 06:00 a 22:00 (Europe/Rome). Fuera de horario respondemos por la mañana.',
      ur: 'ایک آپریٹر 06:00 سے 22:00 (Europe/Rome) WhatsApp پر جواب دیتا ہے۔ آف آورز میں صبح جواب ملے گا۔',
      hi: 'एक व्यक्ति 06:00–22:00 (Europe/Rome) WhatsApp पर जवाब देता है। ऑफ-आवर्स में सुबह जवाब मिलेगा।',
    },
  },
];

const LOCALE_SET = new Set<string>(WA_OPERATOR_LOCALES);

export function isWaOperatorLocale(value: string | null | undefined): value is WaOperatorLocale {
  return !!value && LOCALE_SET.has(value);
}

/** Desk default is Italian. Portal extras map to the nearest of the five. */
export function parseWaOperatorLocale(raw: string | null | undefined): WaOperatorLocale {
  if (isWaOperatorLocale(raw)) return raw;
  if (raw === 'pt') return 'es';
  return 'it';
}

export function waOperatorTextDirection(locale: WaOperatorLocale): 'ltr' | 'rtl' {
  return locale === 'ur' ? 'rtl' : 'ltr';
}

export function waOperatorTemplateBody(
  id: WaOperatorTemplateId,
  locale: WaOperatorLocale,
  vars?: { name?: string | null },
): string {
  if (id === 'call') return callInvite(locale, vars?.name);
  const row = WA_OPERATOR_TEMPLATES.find((t) => t.id === id);
  if (!row) throw new Error(`unknown operator template: ${id}`);
  return row.body[locale];
}
