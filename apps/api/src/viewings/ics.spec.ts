import { describe, expect, it } from 'vitest';

import { buildViewingIcs, viewingIcsUid } from './ics';

describe('viewing ICS', () => {
  it('emits VEVENT with UTC stamps, UID, SEQUENCE', () => {
    const ics = buildViewingIcs({
      uid: viewingIcsUid('abc-123'),
      sequence: 2,
      startMs: Date.UTC(2026, 5, 6, 7, 0, 0),
      endMs: Date.UTC(2026, 5, 6, 7, 45, 0),
      summary: 'Visita — Bilocale Navigli',
      location: 'Via Roma 1, Milano',
    });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:viewing-abc-123@easycasaita.com');
    expect(ics).toContain('SEQUENCE:2');
    expect(ics).toContain('DTSTART:20260606T070000Z');
    expect(ics).toContain('DTEND:20260606T074500Z');
    expect(ics).toContain('SUMMARY:Visita');
    expect(ics).toContain('LOCATION:Via Roma 1');
  });
});
