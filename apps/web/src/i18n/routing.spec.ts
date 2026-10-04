import { describe, expect, it } from 'vitest';
import { routing } from './routing';

describe('web locale routing', () => {
  it('defaults to Italian and does not negotiate Accept-Language', () => {
    expect(routing.locales).toEqual(['it', 'en', 'es']);
    expect(routing.defaultLocale).toBe('it');
    expect(routing.localePrefix).toBe('always');
    expect(routing.localeDetection).toBe(false);
  });
});
