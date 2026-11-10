/**
 * EC-WA-INTAKE-2 translation assist.
 * This module must not import the WhatsApp sender. Only a consultant click sends.
 */

export type TranslateDirection = 'to_customer' | 'to_italian';

export function translateSystem(direction: TranslateDirection, locale: string): string {
  if (direction === 'to_italian') {
    return 'Translate the customer message into Italian. Return JSON {"translation":"..."} and nothing else. Do not give a price, a bid, legal advice, or anything about credit.';
  }
  return `Translate the consultant draft into locale ${locale}. Return JSON {"translation":"..."} and nothing else. Do not add a price, a bid, legal advice, or anything about credit.`;
}

export function translateUser(text: string): string {
  return text.slice(0, 4000);
}

export function parseTranslation(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as { translation?: unknown };
    if (typeof parsed.translation === 'string' && parsed.translation.trim()) {
      return parsed.translation.trim();
    }
  } catch {
    return trimmed;
  }
  return null;
}
