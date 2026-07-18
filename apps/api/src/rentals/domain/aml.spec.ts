import { describe, expect, it } from 'vitest';

import { assessAmlRisk, KycTransitionError, nextKycStatus } from './aml';
import type { AmlFactors } from './types';

function factors(over: Partial<AmlFactors> = {}): AmlFactors {
  return {
    pep: false,
    nonEuId: false,
    cashPayment: false,
    highValue: false,
    identityMismatch: false,
    sanctionsHit: false,
    ...over,
  };
}

describe('AML risk', () => {
  it('clean subject → LOW / ordinary', () => {
    const a = assessAmlRisk(factors());
    expect(a.level).toBe('LOW');
    expect(a.measure).toBe('ORDINARY');
    expect(a.mustEscalate).toBe(false);
  });

  it('two mid factors → MEDIUM', () => {
    expect(assessAmlRisk(factors({ nonEuId: true, cashPayment: true })).level).toBe('MEDIUM');
  });

  it('PEP + identity mismatch → HIGH / enhanced', () => {
    const a = assessAmlRisk(factors({ pep: true, identityMismatch: true }));
    expect(a.level).toBe('HIGH');
    expect(a.measure).toBe('ENHANCED');
  });

  it('sanctions hit forces HIGH and escalation', () => {
    const a = assessAmlRisk(factors({ sanctionsHit: true }));
    expect(a.level).toBe('HIGH');
    expect(a.mustEscalate).toBe(true);
  });
});

describe('KYC state machine', () => {
  it('OPEN → VERIFIED → CLEARED', () => {
    expect(nextKycStatus('OPEN', 'VERIFY')).toBe('VERIFIED');
    expect(nextKycStatus('VERIFIED', 'CLEAR')).toBe('CLEARED');
  });

  it('cannot verify directly when escalation is required', () => {
    expect(() => nextKycStatus('OPEN', 'VERIFY', { mustEscalate: true })).toThrow(
      KycTransitionError,
    );
    expect(nextKycStatus('OPEN', 'ESCALATE')).toBe('ESCALATED');
  });

  it('illegal transitions throw', () => {
    expect(() => nextKycStatus('CLEARED', 'VERIFY')).toThrow(KycTransitionError);
  });
});
