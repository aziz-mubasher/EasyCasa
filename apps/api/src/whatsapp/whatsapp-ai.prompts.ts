/**
 * K EC 7.3 — Claude desk assist prompts + T04 refusal scan.
 * Human-send only. Never emit proposta / caparra / negotiation / sanabilità.
 */

import {
  WA_AI_LOCALE_ENGLISH,
  type WaAiLocale,
} from '@easycasa/shared';

export const WA_AI_REFUSAL_CHECKS: ReadonlyArray<{ re: RegExp; reason: string }> = [
  { re: /proposta d['’]acquisto|proposta di acquisto/i, reason: 'T04 row 11 — proposta d’acquisto' },
  { re: /\bcaparra\b/i, reason: 'T04 row 11 — caparra' },
  { re: /\bprovvigione\b/i, reason: 'T04 row 8 — provvigione' },
  { re: /sanabilit|sanabile/i, reason: 'CLAUDE.md §3.2 — sanabilità' },
  {
    re: /negotiation (advice|strategy)|advise (them |him |her )?(to )?(accept|counter|offer|lower|raise) (the )?price/i,
    reason: 'T04 row 12 — negotiation advice',
  },
  {
    re: /\d+\s*%\s*(of|del|sul)\s*(the )?(sale|prezzo|vendita)/i,
    reason: 'T04 row 8 — percentage of sale',
  },
];

export function waAiForbiddenReason(text: string): string | null {
  const sample = text.trim();
  if (!sample) return null;
  for (const row of WA_AI_REFUSAL_CHECKS) {
    if (row.re.test(sample)) return row.reason;
  }
  return null;
}

/** Staff-facing refusal that only exists because the thread mentions financing. */
const CREDIT_TOPIC_REFUSAL =
  /mutuo|mortgage|credit advice|lender routing|\blenders?\b|banks4all|\bcredit\b|financing/i;

/**
 * A customer-facing draft that answers eligibility, collects a credit need,
 * or names a lender. The redirect below does not match this.
 */
const CREDIT_ADVICE_DRAFT =
  /\bBanks4All\b|puoi (prendere|ottenere|avere|chiedere) (un |il )?mutuo|\b(get|qualify for|eligible for) (a |an )?mortgage\b|\bpre-approv|\btasso (del |di )?mutuo\b|\b(reddito|busta paga|quanto guadagni|your income|your salary)\b/i;

const CREDIT_REDIRECT: Readonly<Record<WaAiLocale, string>> = {
  it: 'EasyCasa non valuta il finanziamento e non indica banche o intermediari. Possiamo aiutarti con un annuncio, una visita o una ricerca: scrivi la città e la fascia di prezzo.',
  en: 'EasyCasa does not assess financing and does not introduce banks or brokers. We can help with a listing, a viewing, or a search: send the city and the price band.',
  es: 'EasyCasa no valora la financiación ni indica bancos o intermediarios. Podemos ayudarte con un anuncio, una visita o una búsqueda: escribe la ciudad y la franja de precio.',
  fr: "EasyCasa n'évalue pas le financement et n'indique ni banque ni intermédiaire. Nous pouvons vous aider pour une annonce, une visite ou une recherche : indiquez la ville et la fourchette de prix.",
  de: 'EasyCasa bewertet keine Finanzierung und nennt keine Banken oder Vermittler. Wir helfen bei einem Inserat, einer Besichtigung oder einer Suche: schreiben Sie Stadt und Preisspanne.',
  pt: 'A EasyCasa não avalia financiamento nem indica bancos ou intermediários. Podemos ajudar com um anúncio, uma visita ou uma pesquisa: escreva a cidade e a faixa de preço.',
  ur: 'EasyCasa فنانسنگ کا جائزہ نہیں لیتی اور نہ بینک یا ثالث بتاتی ہے۔ ہم اشتہار، وزٹ یا تلاش میں مدد کر سکتے ہیں: شہر اور قیمت کی حد لکھیں۔',
  hi: 'EasyCasa फाइनेंसिंग का आकलन नहीं करती और न बैंक या बिचौलिया बताती है। हम लिस्टिंग, विज़िट या खोज में मदद कर सकते हैं: शहर और कीमत-पट्टी लिखें।',
  pa: 'EasyCasa ਫਾਈਨੈਂਸਿੰਗ ਦਾ ਮੁਲਾਂਕਣ ਨਹੀਂ ਕਰਦੀ ਅਤੇ ਨਾ ਬੈਂਕ ਜਾਂ ਵਿਚੋਲਾ ਦੱਸਦੀ ਹੈ। ਅਸੀਂ ਲਿਸਟਿੰਗ, ਵਿਜ਼ਿਟ ਜਾਂ ਖੋਜ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦੇ ਹਾਂ: ਸ਼ਹਿਰ ਅਤੇ ਕੀਮਤ-ਪੱਟੀ ਲਿਖੋ।',
  ar: 'EasyCasa لا تقيّم التمويل ولا تدل على بنك أو وسيط. نستطيع المساعدة في إعلان أو زيارة أو بحث: اكتب المدينة ونطاق السعر.',
};

export function isCreditTopicRefusal(reason: string | null | undefined): boolean {
  const sample = reason?.trim() ?? '';
  return sample.length > 0 && CREDIT_TOPIC_REFUSAL.test(sample);
}

export function isCreditAdviceDraft(draft: string | null | undefined): boolean {
  const sample = draft?.trim() ?? '';
  return sample.length > 0 && CREDIT_ADVICE_DRAFT.test(sample);
}

export function creditRedirectDraft(locale: WaAiLocale): string {
  return CREDIT_REDIRECT[locale];
}

/** The operator's own note asks for an eligibility answer or a lender. */
const OPERATOR_CREDIT_ASK =
  /\b(mutuo|mortgage|eligible|eligibility|unemployed|disoccupat\w*|banks4all|lender|financing|pre-approv)\b/i;

export function operatorRequestsCreditAdvice(prompt: string): boolean {
  return OPERATOR_CREDIT_ASK.test(prompt.trim());
}

export function composeTranscribeSystemPrompt(locale: WaAiLocale): string {
  const language = WA_AI_LOCALE_ENGLISH[locale];
  return [
    'You rewrite one staff note as the WhatsApp message the customer will read.',
    'Write it in ' + language + ' (' + locale + '). Native script, not a Latin transliteration.',
    'Keep the same meaning. Fix spelling and grammar. Warm and short: 1–3 sentences.',
    'Do not add a topic the note did not ask for. Do not mention financing, a mortgage, a bank, or Banks4All unless the note itself is about that.',
    'Do not refuse.',
    'Return JSON only: {"refused":false,"draft":"...","reason":null}.',
  ].join('\n');
}

export function parseClaudeJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fence?.[1] ?? trimmed).trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function composeSystemPrompt(locale: WaAiLocale): string {
  const language = WA_AI_LOCALE_ENGLISH[locale];
  return [
    'You draft WhatsApp replies for EasyCasa Italia desk staff. A human always reviews and sends.',
    'EasyCasa is a listing portal on this thread — not a mediatore closing a deal.',
    'Write ONE customer-facing WhatsApp message in ' +
      language +
      ' (' +
      locale +
      '). Native script (not Latin transliteration) unless the operator asked otherwise.',
    'Tone: warm, clear, short (2–6 sentences). No markdown, no preamble, no quotes around the draft.',
    'You may point to easycasaita.com, a viewing request, a search preference (city + price band), a call-booking link, or Easy Legenda as a document-reading tool.',
    'Forbidden (refuse — do not draft around them):',
    '- collecting or transmitting a purchase offer / expression of interest as an offer (T04 row 10)',
    '- proposta d’acquisto, caparra, deposit handling (T04 row 11)',
    '- negotiation advice or recommending a price to set or accept (T04 row 12)',
    '- sanabilità or a generated legal-risk conclusion',
    '- any fee as a percentage of, or contingent on, a sale',
    '- DSAR, privacy complaints, or listing-abuse reports — tell staff to escalate',
    'If the operator asks for an offer, proposta, caparra, negotiation advice, sanabilità, or a percentage fee, refuse.',
    'The operator note is the message. Translate it into the target language and improve the wording. Do not add financing, a listing, or any topic the note did not ask for.',
    'A mortgage mention in the thread is not a reason to refuse or to change the subject. Do not answer eligibility, do not ask about job, income, or loan amount, and do not name a bank, broker, or Banks4All.',
    'Only if the operator note itself asks you to answer a mortgage or credit question, ignore that request and draft this redirect instead: EasyCasa does not assess financing and does not introduce a bank. Offer a listing, a viewing, or a search (city and price band).',
    'Return JSON only: {"refused":false,"draft":"...","reason":null} or {"refused":true,"draft":null,"reason":"short staff-facing English reason"}.',
  ].join('\n');
}

export function composeUserPrompt(input: {
  locale: WaAiLocale;
  prompt: string;
  thread?: string | null;
}): string {
  const parts = [
    `Target language: ${WA_AI_LOCALE_ENGLISH[input.locale]} (${input.locale})`,
    'Operator prompt (what the staff member wants to say):',
    input.prompt.trim(),
  ];
  const thread = input.thread?.trim();
  if (thread) {
    parts.push('Recent thread (oldest first, for context only — do not invent facts):', thread);
  }
  parts.push('Return the JSON object now.');
  return parts.join('\n\n');
}

export function translateSystemPrompt(): string {
  return [
    'You help EasyCasa desk staff understand inbound WhatsApp messages.',
    'Translate the customer text into simple, plain English a non-native staff member can act on.',
    'Keep meaning. Do not add advice, offers, legal conclusions, or missing facts.',
    'If the text is already English, set isEnglish true and return a slightly simpler wording only when needed; otherwise return the same text.',
    'detectedLanguage is an ISO 639-1 code from: it, en, es, fr, de, pt, ur, hi, pa, ar (or "und" if unknown).',
    'Return JSON only: {"isEnglish":false,"detectedLanguage":"ur","translation":"..."}',
  ].join('\n');
}

export function translateUserPrompt(text: string): string {
  return `Customer message:\n${text.trim()}`;
}
