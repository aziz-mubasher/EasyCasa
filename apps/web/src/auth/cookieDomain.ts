/** Cookie Domain for `ec_access` so legenda.easycasaita.com can read the session. */

export function accessCookieDomainAttr(
  hostname: string | undefined = typeof location !== 'undefined' ? location.hostname : undefined,
): string {
  const explicit = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim();
  if (explicit) {
    const d = explicit.startsWith('.') ? explicit : `.${explicit}`;
    return `; Domain=${d}`;
  }
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') return '';
  if (hostname === 'easycasaita.com' || hostname.endsWith('.easycasaita.com')) {
    return '; Domain=.easycasaita.com';
  }
  return '';
}

export function isAllowedLegendaReturn(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    return u.hostname === 'easycasaita.com' || u.hostname.endsWith('.easycasaita.com');
  } catch {
    return false;
  }
}
