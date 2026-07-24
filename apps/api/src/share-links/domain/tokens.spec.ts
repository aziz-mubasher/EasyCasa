import { describe, expect, it } from 'vitest';

import {
  generateShareToken,
  normalizeOpaqueVisitorId,
  utcViewDate,
  visitorHashForView,
} from './tokens';

describe('share link tokens', () => {
  it('generates URL-safe unguessable tokens', () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('hashes visitors without storing raw ids', () => {
    const day = utcViewDate(new Date('2026-07-24T12:00:00.000Z'));
    const h1 = visitorHashForView('secret', 'link-1', day, 'visitor-abc');
    const h2 = visitorHashForView('secret', 'link-1', day, 'visitor-abc');
    const h3 = visitorHashForView('secret', 'link-1', day, 'visitor-xyz');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects malformed opaque visitor ids', () => {
    expect(normalizeOpaqueVisitorId('')).toBeNull();
    expect(normalizeOpaqueVisitorId('short')).toBeNull();
    expect(normalizeOpaqueVisitorId('bad chars!')).toBeNull();
    expect(normalizeOpaqueVisitorId('valid-opaque-id-12345678')).toBe('valid-opaque-id-12345678');
  });
});
