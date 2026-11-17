import { addRomeDays, romeParts, romeToUtc, type RomeParts } from './rome';

/** A Rome-local window the caller's words point at. Null means unparseable. */
export type PhraseWindow = {
  start: Date;
  end: Date;
  label: string;
};

const TOMORROW = [
  'domani',
  'tomorrow',
  'mañana',
  'manana',
  'demain',
  'morgen',
  'amanhã',
  'amanha',
  'bukra',
  'bokra',
  'ghadan',
  'ghadan',
  'غدًا',
  'غدا',
  'mâine',
  'maine',
  'завтра',
  'kal',
  'agamikal',
];

const MORNING = [
  'mattina',
  'morning',
  'matin',
  'vormittag',
  'manhã',
  'manha',
  'subah',
  'saver',
  'sokal',
  'sabah',
  'صباح',
  'diminea',
  'утром',
  'por la mañana',
  'por la manana',
];

const AFTERNOON = [
  'pomeriggio',
  'afternoon',
  'après-midi',
  'apres-midi',
  'apres midi',
  'nachmittag',
  'tarde',
  'à tarde',
  'a tarde',
  'dopahar',
  'dupehr',
  'bikel',
  'baad al',
  'بعد الظهر',
  'dupa-amiaza',
  'după-amiază',
  'днём',
  'днем',
];

const EVENING = [
  'sera',
  'evening',
  'soir',
  'abend',
  'noite',
  'shaam',
  'sham',
  'sondha',
  'masa',
  'مساء',
  'seara',
  'вечером',
];

const WEEKDAYS: Array<{ n: number; words: string[] }> = [
  { n: 1, words: ['lunedì', 'lunedi', 'monday', 'lunes', 'lundi', 'montag', 'segunda', 'peer', 'somvar', 'sombaar', 'ithnin'] },
  { n: 2, words: ['martedì', 'martedi', 'tuesday', 'martes', 'mardi', 'dienstag', 'terça', 'terca', 'mangal', 'mangalvar'] },
  { n: 3, words: ['mercoledì', 'mercoledi', 'wednesday', 'miércoles', 'miercoles', 'mercredi', 'mittwoch', 'quarta', 'budh'] },
  { n: 4, words: ['giovedì', 'giovedi', 'thursday', 'jueves', 'jeudi', 'donnerstag', 'quinta', 'guruvar', 'brihaspati'] },
  { n: 5, words: ['venerdì', 'venerdi', 'friday', 'viernes', 'vendredi', 'freitag', 'sexta', 'shukravar', 'jumma'] },
  { n: 6, words: ['sabato', 'saturday', 'sábado', 'sabado', 'samedi', 'samstag', 'shanivar'] },
  { n: 7, words: ['domenica', 'sunday', 'domingo', 'dimanche', 'sonntag', 'ravivar'] },
];

function hasToken(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'u').test(text);
}

function dayPart(text: string): { start: number; end: number; label: string } | null {
  if (MORNING.some((w) => hasToken(text, w))) return { start: 9 * 60, end: 13 * 60, label: 'morning' };
  if (AFTERNOON.some((w) => hasToken(text, w))) return { start: 13 * 60, end: 17 * 60, label: 'afternoon' };
  if (EVENING.some((w) => hasToken(text, w))) return { start: 17 * 60, end: 21 * 60, label: 'evening' };
  return null;
}

function explicitTime(text: string): number | null {
  const clock = /(\d{1,2})[:.](\d{2})/.exec(text);
  if (clock) {
    const h = Number(clock[1]);
    const m = Number(clock[2]);
    if (h <= 23 && m <= 59) return h * 60 + m;
  }
  const ampm = /\b(\d{1,2})\s*(am|pm)\b/i.exec(text);
  if (!ampm) return null;
  let h = Number(ampm[1]);
  const ap = ampm[2].toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23) return null;
  return h * 60;
}

function withoutDayParts(text: string): string {
  const phrases = [...MORNING, ...AFTERNOON, ...EVENING].sort((a, b) => b.length - a.length);
  let scan = text;
  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    scan = scan.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'gu'), ' ');
  }
  return scan;
}

function targetDay(text: string, today: RomeParts): RomeParts | null {
  const scan = withoutDayParts(text);
  const tomorrow = TOMORROW.some((w) => hasToken(scan, w));
  if (tomorrow) return addRomeDays(today.year, today.month, today.day, 1);
  if (hasToken(text, 'oggi') || hasToken(text, 'today') || hasToken(text, 'hoy') || hasToken(text, 'heute') || hasToken(text, 'aaj') || hasToken(text, 'aj')) {
    return today;
  }
  for (const day of WEEKDAYS) {
    if (day.words.some((w) => hasToken(text, w))) {
      let delta = (day.n - today.weekday + 7) % 7;
      if (delta === 0) delta = 7;
      if (/\bnext\b|prossim/.test(text)) {
        /* already the next occurrence */
      }
      return addRomeDays(today.year, today.month, today.day, delta);
    }
  }
  return null;
}

export function parsePreferredTime(words: string | null | undefined, now: Date): PhraseWindow | null {
  const text = (words ?? '').trim().toLowerCase();
  if (!text) return null;
  const today = romeParts(now);
  const day = targetDay(text, today);
  const part = dayPart(text);
  const clock = explicitTime(text);
  if (!day && !part && clock == null) return null;

  const base = day ?? (part || clock != null ? today : null);
  if (!base) return null;

  let startMin = 9 * 60;
  let endMin = 21 * 60;
  let label = 'day';
  if (part) {
    startMin = part.start;
    endMin = part.end;
    label = part.label;
  }
  if (clock != null) {
    startMin = clock;
    endMin = Math.min(clock + 60, 24 * 60);
    label = 'time';
  }
  const start = romeToUtc(base.year, base.month, base.day, Math.floor(startMin / 60), startMin % 60);
  const end = romeToUtc(base.year, base.month, base.day, Math.floor(endMin / 60), endMin % 60);
  if (end.getTime() <= now.getTime() && !day) {
    const next = addRomeDays(base.year, base.month, base.day, 1);
    return {
      start: romeToUtc(next.year, next.month, next.day, Math.floor(startMin / 60), startMin % 60),
      end: romeToUtc(next.year, next.month, next.day, Math.floor(endMin / 60), endMin % 60),
      label,
    };
  }
  return { start, end, label };
}

export function slotInWindow(slotStart: Date, window: PhraseWindow): boolean {
  return slotStart.getTime() >= window.start.getTime() && slotStart.getTime() < window.end.getTime();
}
