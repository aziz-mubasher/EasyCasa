import { describe, expect, it } from 'vitest';

import {
  decodeCursor,
  encodeCursor,
  remainingMs,
  windowStateAt,
} from './whatsapp-inbound-admin.service';

describe('windowStateAt (EC-19, fixed clock)', () => {
  const now = new Date('2026-07-31T12:00:00.000Z');

  it('open at 23h59m remaining', () => {
    const expires = new Date(now.getTime() + (24 * 60 - 1) * 60_000);
    expect(windowStateAt(expires, now)).toBe('open');
  });

  it('closed at 24h01m past expiry', () => {
    const expires = new Date(now.getTime() - 60_000);
    expect(windowStateAt(expires, now)).toBe('closed');
  });

  it('closing_soon under two hours only', () => {
    const underTwo = new Date(now.getTime() + 90 * 60_000);
    const exactlyTwo = new Date(now.getTime() + 2 * 60 * 60_000);
    expect(windowStateAt(underTwo, now)).toBe('closing_soon');
    expect(windowStateAt(exactlyTwo, now)).toBe('open');
    expect(remainingMs(underTwo, now)).toBe(90 * 60_000);
  });
});

describe('cursor encode/decode', () => {
  it('round-trips and is stable for identical timestamps', () => {
    const t = new Date('2026-07-31T12:00:00.000Z');
    const a = encodeCursor(t, '00000000-0000-4000-8000-000000000001');
    const b = encodeCursor(t, '00000000-0000-4000-8000-000000000002');
    expect(decodeCursor(a)).toEqual({
      t: t.toISOString(),
      i: '00000000-0000-4000-8000-000000000001',
    });
    expect(a).not.toEqual(b);
  });
});
