/** Deterministic model for CI when GEMINI key absent. */

const AI_LINE_IT = "Sono un'assistente virtuale (intelligenza artificiale).";

export function stubModelReply(userText: string, locale: string): string {
  void locale;
  const t = userText.toLowerCase();
  if ((/check-?up|fascicolo|documenti/.test(t) || /listing fee/.test(t)) && /quanto|cost|prezzo|price|how much/.test(t)) {
    return `Il check-up documentale (fascicolo) costa 149 euro sul sito.\n\n${AI_LINE_IT}`;
  }
  if (/mutuo|mortgage|loan/.test(t)) {
    return 'Questa linea non si occupa di mutui o finanziamenti.';
  }
  if (/voice|vocale|آڈیو/.test(t) || locale === 'ur') {
    return `میں آپ کی مدد کے لیے یہاں ہوں۔\n\n${AI_LINE_IT}`;
  }
  return `Posso aiutarla con Easy Casa Italia ed Easy Legenda.\n\n${AI_LINE_IT}`;
}