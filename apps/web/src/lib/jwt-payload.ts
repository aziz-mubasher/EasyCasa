function looksLikeEmail(value: string): boolean {
  return value.includes('@') && value.includes('.');
}

/** Decode email claim from OIDC access JWT (routing only — API verifies signature). */
export function emailFromAccessToken(token: string | undefined): string | undefined {
  if (!token?.includes('.')) return undefined;
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return undefined;
    const json = Buffer.from(payloadPart, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as {
      email?: unknown;
      preferred_username?: unknown;
    };
    if (typeof payload.email === 'string' && payload.email.trim()) {
      return payload.email.trim();
    }
    // Some Keycloak setups omit `email` but put an email-shaped username in preferred_username.
    if (typeof payload.preferred_username === 'string' && looksLikeEmail(payload.preferred_username)) {
      return payload.preferred_username.trim();
    }
    return undefined;
  } catch {
    return undefined;
  }
}
