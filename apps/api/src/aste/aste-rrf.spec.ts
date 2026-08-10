import { describe, expect, it } from 'vitest';

import { rrfMerge } from './aste-rrf';

describe('rrfMerge', () => {
  it('prefers ids that appear in both legs', () => {
    const { ids, both } = rrfMerge(['a', 'b', 'c'], ['c', 'd', 'a'], { limit: 3 });
    expect(ids[0]).toBe('a'); // rank 1 vector + rank 3 lexical vs c rank 3+1
    // a: 1/61 + 1/63; c: 1/63 + 1/61 — equal; stable sort by id → a before c
    expect(ids).toContain('c');
    expect(both).toBeGreaterThanOrEqual(1);
  });

  it('returns vector-only hits when lexical empty', () => {
    const { ids, vectorOnly, lexicalOnly } = rrfMerge(['x', 'y'], [], { limit: 8 });
    expect(ids).toEqual(['x', 'y']);
    expect(vectorOnly).toBe(2);
    expect(lexicalOnly).toBe(0);
  });

  it('returns lexical-only hits when vector empty', () => {
    const { ids, vectorOnly, lexicalOnly } = rrfMerge([], ['p', 'q'], { limit: 8 });
    expect(ids).toEqual(['p', 'q']);
    expect(vectorOnly).toBe(0);
    expect(lexicalOnly).toBe(2);
  });

  it('respects limit', () => {
    const { ids } = rrfMerge(
      ['1', '2', '3', '4', '5'],
      ['6', '7', '8', '9', '10'],
      { limit: 4 },
    );
    expect(ids).toHaveLength(4);
  });
});
