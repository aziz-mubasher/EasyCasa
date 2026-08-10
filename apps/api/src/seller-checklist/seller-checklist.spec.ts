import { describe, expect, it } from 'vitest';

import {
  completenessPercent,
  emptyChecklistItems,
  scoreChecklist,
} from '@easycasa/shared';

describe('seller checklist scoring (EC-S-T18)', () => {
  it('starts empty at 0/4', () => {
    const score = scoreChecklist(emptyChecklistItems());
    expect(score).toEqual({ have: 0, total: 4 });
    expect(completenessPercent(score)).toBe(0);
  });

  it('counts attached docs only', () => {
    const items = emptyChecklistItems().map((i, idx) =>
      idx < 3 ? { ...i, docKey: `users/u/docs/checklist/l/x-${idx}.pdf`, addedAt: '2026-08-10' } : i,
    );
    expect(scoreChecklist(items)).toEqual({ have: 3, total: 4 });
    expect(completenessPercent(scoreChecklist(items))).toBe(75);
  });
});
