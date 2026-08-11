import { describe, expect, it } from 'vitest';

import {
  asteFinancingPlacement,
  resolveAsteFinancingTrigger,
  type AsteFinancingTriggerInput,
} from './aste-financing-trigger';

function base(over: Partial<AsteFinancingTriggerInput> = {}): AsteFinancingTriggerInput {
  return {
    buyerProfile: { financing_needed: null },
    buyerReadiness: { checklist: [] },
    extraction: {
      giuridica: { stato_occupazione: { stato: 'libero' } },
      urbanistica: {
        conformita_urbanistica: { stato: 'conforme' },
        conformita_catastale: { stato: 'conforme' },
        difformita: [],
      },
    },
    fullReportContext: true,
    reprocessRequired: false,
    ...over,
  };
}

describe('resolveAsteFinancingTrigger (EC-28)', () => {
  it('trigger 1: financing_needed → financing_need', () => {
    expect(
      resolveAsteFinancingTrigger(
        base({ buyerProfile: { financing_needed: true } }),
      ),
    ).toBe('financing_need');
  });

  it('trigger 2: checklist financing_timeline → readiness_financing', () => {
    expect(
      resolveAsteFinancingTrigger(
        base({
          buyerReadiness: {
            checklist: [{ key: 'financing_timeline', level: 'verify' }],
          },
        }),
      ),
    ).toBe('readiness_financing');
  });

  it('trigger 2: non_eu_eligibility_counsel → readiness_financing', () => {
    expect(
      resolveAsteFinancingTrigger(
        base({
          buyerReadiness: {
            checklist: [{ key: 'non_eu_eligibility_counsel', level: 'verify' }],
          },
        }),
      ),
    ).toBe('readiness_financing');
  });

  it('trigger 3: occupied → mutuabilita', () => {
    expect(
      resolveAsteFinancingTrigger(
        base({
          extraction: {
            giuridica: { stato_occupazione: { stato: 'occupato dal debitore' } },
            urbanistica: {
              conformita_urbanistica: { stato: 'conforme' },
              conformita_catastale: { stato: 'conforme' },
              difformita: [],
            },
          },
        }),
      ),
    ).toBe('mutuabilita');
  });

  it('trigger 3: difformita → mutuabilita', () => {
    expect(
      resolveAsteFinancingTrigger(
        base({
          extraction: {
            giuridica: { stato_occupazione: { stato: 'libero' } },
            urbanistica: {
              conformita_urbanistica: { stato: 'conforme' },
              conformita_catastale: { stato: 'conforme' },
              difformita: [{ descrizione: 'superfetazione' }],
            },
          },
        }),
      ),
    ).toBe('mutuabilita');
  });

  it('trigger 3: non-conform urbanistica → mutuabilita', () => {
    expect(
      resolveAsteFinancingTrigger(
        base({
          extraction: {
            giuridica: { stato_occupazione: { stato: 'libero' } },
            urbanistica: {
              conformita_urbanistica: { stato: 'non conforme' },
              conformita_catastale: { stato: 'conforme' },
              difformita: [],
            },
          },
        }),
      ),
    ).toBe('mutuabilita');
  });

  it('none → null', () => {
    expect(resolveAsteFinancingTrigger(base())).toBeNull();
  });

  it('priority 1 > 2 > 3 when all fire', () => {
    expect(
      resolveAsteFinancingTrigger(
        base({
          buyerProfile: { financing_needed: true },
          buyerReadiness: {
            checklist: [{ key: 'financing_timeline', level: 'verify' }],
          },
          extraction: {
            giuridica: { stato_occupazione: { stato: 'occupato' } },
            urbanistica: {
              conformita_urbanistica: { stato: 'non conforme' },
              conformita_catastale: { stato: 'conforme' },
              difformita: [{ descrizione: 'x' }],
            },
          },
        }),
      ),
    ).toBe('financing_need');
  });

  it('priority 2 > 3 when financing_needed false', () => {
    expect(
      resolveAsteFinancingTrigger(
        base({
          buyerProfile: { financing_needed: false },
          buyerReadiness: {
            checklist: [{ key: 'non_eu_eligibility_counsel', level: 'verify' }],
          },
          extraction: {
            giuridica: { stato_occupazione: { stato: 'occupato' } },
            urbanistica: {
              conformita_urbanistica: { stato: 'conforme' },
              conformita_catastale: { stato: 'conforme' },
              difformita: [],
            },
          },
        }),
      ),
    ).toBe('readiness_financing');
  });

  it('no render on reprocessRequired', () => {
    expect(
      resolveAsteFinancingTrigger(
        base({
          buyerProfile: { financing_needed: true },
          reprocessRequired: true,
        }),
      ),
    ).toBeNull();
  });

  it('no render without fullReportContext (teaser gate)', () => {
    expect(
      resolveAsteFinancingTrigger(
        base({
          buyerProfile: { financing_needed: true },
          fullReportContext: false,
        }),
      ),
    ).toBeNull();
  });
});

describe('asteFinancingPlacement', () => {
  it('buyer readiness for triggers 1–2', () => {
    expect(asteFinancingPlacement('financing_need')).toBe('buyer_readiness');
    expect(asteFinancingPlacement('readiness_financing')).toBe('buyer_readiness');
  });

  it('after criticità for mutuabilita', () => {
    expect(asteFinancingPlacement('mutuabilita')).toBe('after_criticita');
  });
});
