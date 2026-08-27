import { afterEach, describe, expect, it } from 'vitest';

import { accessCookieDomainAttr, isAllowedLegendaReturn } from './cookieDomain';

describe('accessCookieDomainAttr', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  });

  it('shares the session on easycasaita.com subdomains', () => {
    expect(accessCookieDomainAttr('easycasaita.com')).toBe('; Domain=.easycasaita.com');
    expect(accessCookieDomainAttr('www.easycasaita.com')).toBe('; Domain=.easycasaita.com');
  });

  it('stays host-only on localhost', () => {
    expect(accessCookieDomainAttr('localhost')).toBe('');
  });

  it('honors NEXT_PUBLIC_COOKIE_DOMAIN', () => {
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN = 'easycasaita.com';
    expect(accessCookieDomainAttr('localhost')).toBe('; Domain=.easycasaita.com');
  });
});

describe('isAllowedLegendaReturn', () => {
  it('allows https lab host and rejects others', () => {
    expect(isAllowedLegendaReturn('https://legenda.easycasaita.com/it/aste/lab')).toBe(true);
    expect(isAllowedLegendaReturn('http://legenda.easycasaita.com/it/aste/lab')).toBe(false);
    expect(isAllowedLegendaReturn('https://evil.example/it/aste/lab')).toBe(false);
    expect(isAllowedLegendaReturn('/it/aste/lab')).toBe(false);
  });
});
