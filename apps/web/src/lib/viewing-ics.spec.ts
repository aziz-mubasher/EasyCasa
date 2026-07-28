import { describe, expect, it } from 'vitest';

import { buildViewingIcs, toIcsUtc, viewingIcsDataUrl } from './viewing-ics';

describe('viewing-ics', () => {
  it('formats UTC ICS datetimes', () => {
    // 2026-06-06 09:00 Europe/Rome (CEST) = 07:00Z
    expect(toIcsUtc(Date.UTC(2026, 5, 6, 7, 0, 0))).toBe('20260606T070000Z');
  });

  it('builds a minimal VEVENT', () => {
    const ics = buildViewingIcs({
      uid: 'abc@easycasa',
      title: 'Visita · Via Roma 1',
      startMs: Date.UTC(2026, 5, 6, 7, 0, 0),
      endMs: Date.UTC(2026, 5, 6, 7, 45, 0),
      address: 'Via Roma 1, Milano',
    });
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20260606T070000Z');
    expect(ics).toContain('DTEND:20260606T074500Z');
    expect(ics).toContain('SUMMARY:Visita · Via Roma 1');
    expect(ics).toContain('LOCATION:Via Roma 1\\, Milano');
    expect(ics).toContain('UID:abc@easycasa');
  });

  it('exposes a data URL', () => {
    const url = viewingIcsDataUrl({
      uid: 'x',
      title: 'Test',
      startMs: 0,
      endMs: 60_000,
    });
    expect(url.startsWith('data:text/calendar;charset=utf-8,')).toBe(true);
  });
});
