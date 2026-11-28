export type InboundKind =
  | 'greeting'
  | 'clear_question'
  | 'info_without_ask'
  | 'menu_choice'
  | 'document'
  | 'voice_note'
  | 'route_after_welcome'
  | 'other';

const GREETING = /^(ciao|salve|salam|hello|hi|hey|hola|bonjour|info|informazioni|emoji-only)$/i;

export function classifyTextInbound(text: string, opts: { hasWelcome: boolean; messageType?: string }): InboundKind {
  if (opts.messageType && /^(image|document|audio|video|sticker)$/i.test(opts.messageType)) {
    if (opts.messageType === 'audio') return 'voice_note';
    if (opts.messageType === 'image' || opts.messageType === 'document') return 'document';
  }
  const t = text.trim();
  if (!t) return 'greeting';
  if (opts.hasWelcome) {
    if (/^(10|11|12|[1-9])$/.test(t.replace(/\s/g, '')) || /^[1-9]$/.test(t.trim())) return 'route_after_welcome';
    if (/easy\s*casa/i.test(t)) return 'route_after_welcome';
    if (/easy\s*legenda/i.test(t)) return 'route_after_welcome';
  }
  if (t.length <= 24 && (GREETING.test(t) || /^[\p{Emoji}\s]+$/u.test(t))) return 'greeting';
  if (/vorrei informazioni|mi servono informazioni|i would like information|quiero información/i.test(t)) {
    return 'info_without_ask';
  }
  if (t.includes('?') || /\b(quanto|how much|price|cost|cosa|what|come|where|chi)\b/i.test(t)) {
    return 'clear_question';
  }
  if (t.split(/\s+/).length >= 4) return 'clear_question';
  return 'greeting';
}