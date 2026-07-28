/**
 * Client-side ICS for confirmed viewings (API may ship ICS later).
 * Times are written as UTC (Z) from epoch ms.
 */

export type ViewingIcsInput = {
  uid: string;
  title: string;
  startMs: number;
  endMs: number;
  address?: string | null;
  description?: string | null;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format epoch ms as UTC ICS datetime: YYYYMMDDTHHMMSSZ */
export function toIcsUtc(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function buildViewingIcs(input: ViewingIcsInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EasyCasa//Viewings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(input.uid)}`,
    `DTSTAMP:${toIcsUtc(Date.now())}`,
    `DTSTART:${toIcsUtc(input.startMs)}`,
    `DTEND:${toIcsUtc(input.endMs)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
  ];
  if (input.address?.trim()) {
    lines.push(`LOCATION:${escapeIcsText(input.address.trim())}`);
  }
  if (input.description?.trim()) {
    lines.push(`DESCRIPTION:${escapeIcsText(input.description.trim())}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR', '');
  return lines.join('\r\n');
}

/** `data:` URL suitable for an &lt;a download&gt; / open-in-calendar link. */
export function viewingIcsDataUrl(input: ViewingIcsInput): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildViewingIcs(input))}`;
}
