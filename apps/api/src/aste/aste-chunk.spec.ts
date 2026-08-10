import { describe, expect, it } from 'vitest';

import { chunkPageTexts } from './aste-chunk';

describe('chunkPageTexts', () => {
  it('keeps short pages as single chunks', () => {
    const chunks = chunkPageTexts([
      { page: 1, text: 'hello world' },
      { page: 2, text: 'second page' },
    ]);
    expect(chunks).toEqual([
      { page: 1, chunkIndex: 0, text: 'hello world' },
      { page: 2, chunkIndex: 0, text: 'second page' },
    ]);
  });

  it('never spans pages and splits oversized pages', () => {
    const big = 'word '.repeat(1200); // ~6000 chars
    const chunks = chunkPageTexts([{ page: 3, text: big }], 4000);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.page === 3)).toBe(true);
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_, i) => i));
    expect(chunks.every((c) => c.text.length <= 4000)).toBe(true);
  });

  it('skips empty pages', () => {
    expect(chunkPageTexts([{ page: 1, text: '   ' }])).toEqual([]);
  });
});
