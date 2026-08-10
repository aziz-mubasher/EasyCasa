/** True for standalone marketing service landings (own chrome, no app footer). */
export function isMarketingServicePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /^\/(acquisto-assistito|for-buyers|about|aste(?:\/guida)?|vendi-da-privato|sell-privately|vender-como-particular)\/?$/.test(
    pathname,
  );
}
