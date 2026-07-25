/** True for public listing detail landing: /listings/:slug (locale stripped by next-intl). */
export function isListingLandingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /^\/listings\/[^/]+\/?$/.test(pathname);
}
