/** Localized public slugs for About-indexed legal pages. */

export function transparencyPath(locale: string): string {
  return locale === 'en' ? '/transparency' : '/trasparenza';
}

export function contactPath(locale: string): string {
  return locale === 'en' ? '/contact' : '/contatti';
}

export function transparencyAbsoluteUrl(
  locale: string,
  site = 'https://easycasaita.com',
): string {
  return `${site}/${locale}${transparencyPath(locale)}`;
}

export function contactAbsoluteUrl(locale: string, site = 'https://easycasaita.com'): string {
  return `${site}/${locale}${contactPath(locale)}`;
}

/** Map filesystem / i18n hrefs used in message files onto the public slug. */
export function localizeSiteHref(href: string, locale: string): string {
  if (href === '/trasparenza') return transparencyPath(locale);
  if (href === '/contatti') return contactPath(locale);
  return href;
}
