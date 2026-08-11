import { createHmac } from 'node:crypto';

/**
 * EC-26 — admin masking for Aste ops surfaces (EC-19 / EC-19a discipline).
 * List/detail defaults are masked; identity/filename reveal is audited separately.
 */

/** Opaque user reference — not reversible without the HMAC secret. */
export function opaqueUserRef(userId: string, secret: string): string {
  return createHmac('sha256', secret).update(`aste-user:${userId}`).digest('hex').slice(0, 16);
}

/**
 * Pattern-mask a document filename: keep first char + extension, bullet the rest.
 * Not a security control — detail reveal + audit are the real control.
 */
export function maskFilename(name: string | null | undefined): string {
  if (name == null || name === '') return '••';
  const lastDot = name.lastIndexOf('.');
  const hasExt = lastDot > 0 && lastDot < name.length - 1;
  const base = hasExt ? name.slice(0, lastDot) : name;
  const ext = hasExt ? name.slice(lastDot) : '';
  if (base.length <= 1) return `•${ext}`;
  if (base.length === 2) return `${base[0]}•${ext}`;
  return `${base[0]}${'•'.repeat(Math.min(8, base.length - 1))}${ext}`;
}

/** Map stored failure_reason to a short category for list display. */
export function failureReasonCategory(reason: string | null | undefined): string | null {
  if (reason == null || reason === '') return null;
  const r = reason.trim().toLowerCase();
  if (r.startsWith('stale') || r.includes('stale_processing')) return 'stale';
  if (r.includes('ocr')) return 'ocr';
  if (r.includes('extract')) return 'extract';
  if (r.includes('embed')) return 'embed';
  if (r.includes('no_documents') || r.includes('no_document')) return 'no_documents';
  if (r.includes('timeout') || r.includes('timed_out')) return 'timeout';
  if (r.includes('lotto')) return 'lotto';
  if (r.includes('ai') || r.includes('openai') || r.includes('translate')) return 'ai';
  // Prefer first snake_case token as category when unknown.
  const token = r.split(/[^a-z0-9_]+/)[0];
  return token || 'unknown';
}
