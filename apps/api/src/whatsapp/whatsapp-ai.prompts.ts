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
    '- mutuo / credit advice or lender routing',
    '- DSAR, privacy complaints, or listing-abuse reports — tell staff to escalate',
    'If the operator prompt or thread asks for a forbidden act, refuse.',
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
