/**
 * Build a minimal RFC 5545 VEVENT (.ics) for viewing emails.
 * DTSTART/DTEND in UTC (`Z`). UID stable across updates; SEQUENCE increments.
 */

export interface IcsEventInput {
  uid: string;
  sequence: number;
  startMs: number;
  endMs: number;
  summary: string;
  location?: string;
  description?: string;
  /** METHOD: REQUEST for invite, CANCEL for cancellation. */
  method?: 'REQUEST' | 'CANCEL';
}

function formatUtcStamp(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

function fold(line: string): string {
  // Soft fold at 75 octets (approx chars for ASCII).
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}

function escText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildViewingIcs(input: IcsEventInput): string {
  const method = input.method ?? 'REQUEST';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EasyCasa//Viewings//EN',
    `METHOD:${method}`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `SEQUENCE:${Math.max(0, input.sequence)}`,
    `DTSTAMP:${formatUtcStamp(Date.now())}`,
    `DTSTART:${formatUtcStamp(input.startMs)}`,
    `DTEND:${formatUtcStamp(input.endMs)}`,
    `SUMMARY:${escText(input.summary)}`,
  ];
  if (input.location) lines.push(`LOCATION:${escText(input.location)}`);
  if (input.description) lines.push(`DESCRIPTION:${escText(input.description)}`);
  if (method === 'CANCEL') lines.push('STATUS:CANCELLED');
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Stable UID for a viewing id (never changes on reschedule). */
export function viewingIcsUid(viewingId: string): string {
  return `viewing-${viewingId}@easycasaita.com`;
}
