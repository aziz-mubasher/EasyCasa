/**
 * Upload object-key construction (pure, security-relevant).
 *
 * Keys are always scoped under the authenticated user's prefix, and the
 * client-supplied filename is reduced to a safe basename so a caller can never
 * escape their prefix (path traversal) or inject separators.
 */

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function isAllowedContentType(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.has(contentType);
}

/** Reduce an arbitrary filename to a safe basename. */
export function safeBasename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? 'file';
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 120);
  return cleaned.length > 0 ? cleaned : 'file';
}

/**
 * Build a storage key scoped to the user. Keeps the Phase 9 prefix
 * `users/{id}/docs/` so existing objects stay compatible. `id` is a
 * caller-provided unique token (e.g. a uuid) so the result is testable.
 */
export function buildObjectKey(userId: string, filename: string, id: string): string {
  const user = userId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `users/${user}/docs/${id}-${safeBasename(filename)}`;
}
