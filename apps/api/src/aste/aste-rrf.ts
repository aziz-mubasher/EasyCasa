/**
 * EC-25 — reciprocal rank fusion for hybrid retrieval (vector + lexical).
 * Pure arithmetic — unit-tested; no deps.
 */

export type RankedHit = { id: string; rank: number };

export const RRF_K = 60;
export const RRF_PER_LEG = 20;
export const RRF_TOP_N = 8;

/** Fuse two ranked id lists (best-first). Higher score wins. */
export function rrfMerge(
  vectorIds: string[],
  lexicalIds: string[],
  opts?: { k?: number; limit?: number },
): { ids: string[]; scores: Record<string, number>; vectorOnly: number; lexicalOnly: number; both: number } {
  const k = opts?.k ?? RRF_K;
  const limit = opts?.limit ?? RRF_TOP_N;
  const scores: Record<string, number> = {};
  const inVector = new Set(vectorIds);
  const inLexical = new Set(lexicalIds);

  vectorIds.forEach((id, i) => {
    scores[id] = (scores[id] ?? 0) + 1 / (k + i + 1);
  });
  lexicalIds.forEach((id, i) => {
    scores[id] = (scores[id] ?? 0) + 1 / (k + i + 1);
  });

  const ids = Object.keys(scores)
    .sort((a, b) => (scores[b]! - scores[a]!) || a.localeCompare(b))
    .slice(0, limit);

  let vectorOnly = 0;
  let lexicalOnly = 0;
  let both = 0;
  for (const id of ids) {
    const v = inVector.has(id);
    const l = inLexical.has(id);
    if (v && l) both += 1;
    else if (v) vectorOnly += 1;
    else lexicalOnly += 1;
  }

  return { ids, scores, vectorOnly, lexicalOnly, both };
}
