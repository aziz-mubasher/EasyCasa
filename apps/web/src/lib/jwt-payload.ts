/** Decode email claim from OIDC access JWT (routing only — API verifies signature). */
export function emailFromAccessToken(token: string | undefined): string | undefined {
  if (!token?.includes('.')) return undefined;
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return undefined;
    const json = Buffer.from(payloadPart, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as { email?: unknown };
    return typeof payload.email === 'string' ? payload.email : undefined;
  } catch {
    return undefined;
  }
}
