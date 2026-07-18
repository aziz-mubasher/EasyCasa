import { describe, expect, it } from 'vitest';

import { tasksForOrder, type RequiredCredential } from './order-tasks';

const policy = (code: string): RequiredCredential => {
  const map: Record<string, RequiredCredential> = {
    FULL_MEDIATION: 'REA_MEDIATORE',
    CONFORMITY_SURVEY: 'ALBO_TECNICO',
    APE_ISSUANCE: 'APE_CERTIFIER',
    VALUATION: 'NONE',
    LISTING_PUBLICATION: 'NONE',
  };
  return map[code] ?? 'NONE';
};

describe('tasksForOrder', () => {
  it('only professional-requiring items spawn tasks', () => {
    const tasks = tasksForOrder(
      ['LISTING_PUBLICATION', 'VALUATION', 'FULL_MEDIATION', 'CONFORMITY_SURVEY'],
      policy,
    );
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.requiredCredential).sort()).toEqual([
      'ALBO_TECNICO',
      'REA_MEDIATORE',
    ]);
  });

  it('NONE-only order spawns no tasks', () => {
    expect(tasksForOrder(['VALUATION', 'LISTING_PUBLICATION'], policy)).toHaveLength(0);
  });

  it('duplicate item codes are deduped', () => {
    expect(tasksForOrder(['FULL_MEDIATION', 'FULL_MEDIATION'], policy)).toHaveLength(1);
  });
});
