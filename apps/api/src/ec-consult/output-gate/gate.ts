import claims from './claims.json';

const ALLOWED_LINKS = [
  'https://easycasaita.com',
  'http://easycasaita.com',
  'https://www.easycasaita.com',
  'https://easycasaita.com/it/pricing',
  'https://legenda.easycasaita.com',
  'https://scuolavideo.com',
];

export type GateHit =
  | { kind: 'banned'; token: string }
  | { kind: 'link'; url: string }
  | { kind: 'price'; amount: string };

export function extractPricesEuro(text: string): string[] {
  const found: string[] = [];
  const re = /(\d{1,4})\s*euro/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) found.push(m[1]!);
  return found;
}

export function allowedPricesFromKb(kbText: string): Set<string> {
  const allowed = new Set<string>();
  for (const p of extractPricesEuro(kbText)) allowed.add(p);
  allowed.add('0');
  return allowed;
}

export function scanBanned(text: string, locale: string): string | null {
  const lower = text.toLowerCase();
  const packs = [
    ...(claims.global as string[]),
    ...(((claims as unknown as Record<string, string[]>)[locale]) ?? []),
  ];
  for (const token of packs) {
    const t = token.toLowerCase();
    if (t === 'legenda' && /easy\s*legenda/i.test(text)) continue;
    if (lower.includes(t)) return token;
  }
  if (/\blegenda\b/i.test(text) && !/easy\s*legenda/i.test(text)) return 'Legenda';
  return null;
}

export function scanLinks(text: string): string | null {
  const re = /https?:\/\/[^\s)]+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const url = m[0]!.replace(/[.,]+$/, '');
    if (!ALLOWED_LINKS.some((ok) => url === ok || url.startsWith(ok + '/'))) return url;
  }
  return null;
}

export function runOutputGate(text: string, locale: string, kbCanonical: string): GateHit[] {
  const hits: GateHit[] = [];
  const banned = scanBanned(text, locale);
  if (banned) hits.push({ kind: 'banned', token: banned });
  const badLink = scanLinks(text);
  if (badLink) hits.push({ kind: 'link', url: badLink });
  const allowed = allowedPricesFromKb(kbCanonical);
  for (const amount of extractPricesEuro(text)) {
    if (!allowed.has(amount)) hits.push({ kind: 'price', amount });
  }
  return hits;
}