/** Lightweight spam heuristics for messages (pre-LLM). */
const URL_RE = /https?:\/\/|www\./gi;

export function isLikelySpam(body: string): boolean {
  const trimmed = body.trim();
  if (trimmed.length < 2) return true;
  const links = (trimmed.match(URL_RE) ?? []).length;
  if (links >= 3) return true;
  const upperRatio = trimmed.replace(/[^A-Za-z]/g, '').length
    ? [...trimmed].filter((c) => c >= 'A' && c <= 'Z').length / trimmed.replace(/[^A-Za-z]/g, '').length
    : 0;
  return trimmed.length > 20 && upperRatio > 0.7;
}

/** Spam/abuse rate control. */
export function canStartConversation(recentCount: number, limitPerHour = 10): boolean {
  return recentCount < limitPerHour;
}
