import { describe, expect, it } from 'vitest';
import { hashShareVisitor, hashShareVisitorDaily, newShareToken } from './visitor-hash';

describe('visitor-hash', () => {
  it('generates unguessable share tokens', () => {
    const a = newShareToken();
    const b = newShareToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it('produces stable lifetime hashes for same visitor', () => {
    const h1 = hashShareVisitor({
      pepper: 'pepper',
      shareLinkId: 'link-1',
      visitorToken: 'visitor-abc',
    });
    const h2 = hashShareVisitor({
      pepper: 'pepper',
      shareLinkId: 'link-1',
      visitorToken: 'visitor-abc',
    });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('daily helper rotates hash when day changes', () => {
    const a = hashShareVisitorDaily({
      pepper: 'pepper',
      shareLinkId: 'link-1',
      visitorToken: 'visitor-abc',
      day: '2026-07-24',
    });
    const b = hashShareVisitorDaily({
      pepper: 'pepper',
      shareLinkId: 'link-1',
      visitorToken: 'visitor-abc',
      day: '2026-07-25',
    });
    expect(a).not.toBe(b);
  });
});
