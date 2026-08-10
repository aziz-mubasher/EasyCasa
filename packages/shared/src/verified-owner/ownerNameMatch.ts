/**
 * EC-S-T16 — Owner-name matching (@easycasa/shared).
 *
 * Compares a seller_profile.display_name against visura intestatari.
 * Pure logic, no OCR. Match verdicts feed the T15 review queue as ADVISORY
 * signals — a moderator always decides; this module never auto-verifies
 * (T04 row 7 anti-fraud framing, human in loop).
 */

export type MatchVerdict = 'match' | 'partial' | 'no_match' | 'company';

export interface MatchResult {
  verdict: MatchVerdict;
  /** 0..1 — token-overlap score of the best intestatario. */
  score: number;
  /** Raw intestatario string that produced the best score. */
  bestIntestatario?: string;
}

const COMPANY_TOKENS = new Set([
  'SRL',
  'SRLS',
  'SPA',
  'SNC',
  'SAS',
  'SS',
  'SCARL',
  'SOCIETA',
  'COOP',
  'COOPERATIVA',
  'ONLUS',
  'FONDAZIONE',
  'IMPRESA',
  'DITTA',
]);

/** Surname particles that must never count as a distinguishing token on their own. */
const PARTICLES = new Set([
  'DI',
  'DE',
  'DEL',
  'DELLA',
  'DELLE',
  'DEI',
  'DEGLI',
  'DA',
  'DAL',
  'DALLA',
  'LO',
  'LA',
  'LE',
  'D',
  'VON',
  'VAN',
]);

export function normalizeName(raw: string): string[] {
  const cleaned = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toUpperCase()
    .replace(/[''`]/g, ' ') // D'ANGELO -> D ANGELO
    .replace(/[^A-Z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length === 0 ? [] : cleaned.split(' ');
}

export function isCompanyName(raw: string): boolean {
  return normalizeName(raw.replace(/\./g, '')).some((t) => COMPANY_TOKENS.has(t));
}

interface TokenSets {
  substantive: Set<string>;
  particles: Set<string>;
}

function tokenSets(raw: string): TokenSets {
  const substantive = new Set<string>();
  const particles = new Set<string>();
  for (const t of normalizeName(raw)) {
    (PARTICLES.has(t) ? particles : substantive).add(t);
  }
  return { substantive, particles };
}

function scorePair(a: TokenSets, b: TokenSets): number {
  if (a.substantive.size === 0 || b.substantive.size === 0) return 0;
  let shared = 0;
  for (const t of a.substantive) if (b.substantive.has(t)) shared += 1;
  const denom = Math.max(a.substantive.size, b.substantive.size);
  return shared / denom;
}

const MATCH_THRESHOLD = 1.0;
const PARTIAL_THRESHOLD = 0.5;

/**
 * Compare seller name to every intestatario; return best.
 * Verdict is ADVISORY — never auto-verifies.
 */
export function matchOwnerName(sellerName: string, intestatari: string[]): MatchResult {
  const seller = tokenSets(sellerName);
  let best: MatchResult = { verdict: 'no_match', score: 0 };

  for (const raw of intestatari) {
    if (isCompanyName(raw)) {
      if (best.verdict === 'no_match' && best.score === 0) {
        best = { verdict: 'company', score: 0, bestIntestatario: raw };
      }
      continue;
    }
    const holder = tokenSets(raw);
    const score = scorePair(seller, holder);
    if (score > best.score || best.verdict === 'company' || best.verdict === 'no_match') {
      let verdict: MatchVerdict = 'no_match';
      let sharedCount = 0;
      for (const t of seller.substantive) if (holder.substantive.has(t)) sharedCount += 1;
      if (score >= MATCH_THRESHOLD) verdict = 'match';
      else if (score >= PARTIAL_THRESHOLD && sharedCount >= 2) verdict = 'partial';
      if (score > best.score || (best.verdict !== 'match' && verdict === 'match')) {
        best = { verdict, score, bestIntestatario: raw };
      }
    }
  }

  return best;
}
