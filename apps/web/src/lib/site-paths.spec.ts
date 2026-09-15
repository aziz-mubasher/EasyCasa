import { describe, expect, it } from 'vitest';
import {
  contactPath,
  localizeSiteHref,
  transparencyAbsoluteUrl,
  transparencyPath,
} from './site-paths';

describe('site-paths (EN slugs + i18n href map)', () => {
  it('maps transparency and contact to English slugs on en only', () => {
    expect(transparencyPath('en')).toBe('/transparency');
    expect(transparencyPath('it')).toBe('/trasparenza');
    expect(transparencyPath('es')).toBe('/trasparenza');
    expect(contactPath('en')).toBe('/contact');
    expect(contactPath('it')).toBe('/contatti');
    expect(contactPath('es')).toBe('/contatti');
  });

  it('rewrites message-file Italian slugs for the active locale', () => {
    expect(localizeSiteHref('/trasparenza', 'en')).toBe('/transparency');
    expect(localizeSiteHref('/contatti', 'en')).toBe('/contact');
    expect(localizeSiteHref('/trasparenza', 'it')).toBe('/trasparenza');
    expect(localizeSiteHref('/search', 'en')).toBe('/search');
  });

  it('builds an absolute English transparency URL', () => {
    expect(transparencyAbsoluteUrl('en')).toBe('https://easycasaita.com/en/transparency');
  });
});
