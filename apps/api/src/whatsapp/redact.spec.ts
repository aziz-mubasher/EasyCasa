import { describe, expect, it } from 'vitest';

import { maskWaId, redactPreview } from './redact';

describe('redactPreview (EC-19)', () => {
  it('masks phone, email, IBAN and codice fiscale in one body', () => {
    const body =
      'Call +39 333 111 2233 or 02 12345678, mail me at seeker@example.com, ' +
      'IBAN IT60X0542811101000000123456, CF RSSMRA85T10A562S thanks';
    const out = redactPreview(body);
    expect(out).not.toMatch(/333/);
    expect(out).not.toMatch(/seeker@example\.com/i);
    expect(out).not.toMatch(/IT60X0542811101000000123456/i);
    expect(out).not.toMatch(/RSSMRA85T10A562S/i);
    expect(out).toContain('[phone]');
    expect(out).toContain('[email]');
    expect(out).toContain('[iban]');
    expect(out).toContain('[cf]');
  });

  it('returns empty for null/empty', () => {
    expect(redactPreview(null)).toBe('');
    expect(redactPreview('')).toBe('');
  });
});

describe('maskWaId', () => {
  it('keeps last 4 digits', () => {
    expect(maskWaId('393331112233')).toBe('••••2233');
    expect(maskWaId('+39')).toBe('••••');
    expect(maskWaId('12')).toBe('••••');
  });
});
