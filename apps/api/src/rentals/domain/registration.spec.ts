import { describe, expect, it } from 'vitest';

import { cedolareRateFor, validateLease } from './lease';
import {
  buildRliPayload,
  computeRegistrationTaxes,
  registrationDeadline,
} from './registration';
import type { LeaseInput } from './types';

function lease(over: Partial<LeaseInput> = {}): LeaseInput {
  return {
    type: 'LIBERO_4_4',
    startAt: '2026-09-01',
    durationMonths: 48,
    annualRentCents: 1_200_000,
    cedolareSecca: false,
    highTension: false,
    apeAttached: true,
    ...over,
  };
}

describe('lease validation & cedolare', () => {
  it('4+4 with APE and 48 months is valid', () => {
    expect(validateLease(lease()).valid).toBe(true);
  });

  it('missing APE blocks the lease', () => {
    const r = validateLease(lease({ apeAttached: false }));
    expect(r.valid).toBe(false);
    expect(r.blockers.some((b) => b.code === 'APE_MISSING')).toBe(true);
  });

  it('out-of-range duration blocks', () => {
    const r = validateLease(lease({ type: 'TRANSITORIO', durationMonths: 24 }));
    expect(r.valid).toBe(false);
    expect(r.blockers.some((b) => b.code === 'DURATION_OUT_OF_RANGE')).toBe(true);
  });

  it('cedolare rate: libero 21, concordato 10, studenti 10', () => {
    expect(cedolareRateFor(lease({ cedolareSecca: true, type: 'LIBERO_4_4' }))).toBe(0.21);
    expect(
      cedolareRateFor(lease({ cedolareSecca: true, type: 'CONCORDATO_3_2', durationMonths: 36 })),
    ).toBe(0.1);
    expect(
      cedolareRateFor(lease({ cedolareSecca: true, type: 'STUDENTI', durationMonths: 12 })),
    ).toBe(0.1);
  });

  it('cedolare rate: transitorio is 10 only in high-tension', () => {
    expect(
      cedolareRateFor(
        lease({ cedolareSecca: true, type: 'TRANSITORIO', durationMonths: 12, highTension: true }),
      ),
    ).toBe(0.1);
    expect(
      cedolareRateFor(
        lease({ cedolareSecca: true, type: 'TRANSITORIO', durationMonths: 12, highTension: false }),
      ),
    ).toBe(0.21);
  });
});

describe('registration taxes & deadline', () => {
  it('cedolare waives registro and bollo', () => {
    const t = computeRegistrationTaxes(lease({ cedolareSecca: true }));
    expect(t.registroCents).toBe(0);
    expect(t.bolloCents).toBe(0);
    expect(t.totalCents).toBe(0);
  });

  it('ordinary registro is 2% of annual rent', () => {
    expect(computeRegistrationTaxes(lease({ annualRentCents: 1_200_000 })).registroCents).toBe(
      24_000,
    );
  });

  it('registro minimum €67 applies to small rents', () => {
    expect(computeRegistrationTaxes(lease({ annualRentCents: 300_000 })).registroCents).toBe(6700);
  });

  it('concordato high-tension reduces registro base to 70%', () => {
    const t = computeRegistrationTaxes(
      lease({
        type: 'CONCORDATO_3_2',
        durationMonths: 36,
        highTension: true,
        annualRentCents: 1_000_000,
      }),
    );
    expect(t.registroCents).toBe(14_000);
  });

  it('bollo defaults to €32 (4 sides, 2 copies)', () => {
    expect(computeRegistrationTaxes(lease()).bolloCents).toBe(3200);
  });

  it('registration deadline is 30 days from earlier of sign/start', () => {
    expect(registrationDeadline({ startAt: '2026-09-01' })).toBe('2026-10-01');
    expect(registrationDeadline({ startAt: '2026-09-10', signedAt: '2026-09-01' })).toBe(
      '2026-10-01',
    );
  });

  it('RLI payload carries rate, deadline, and taxes', () => {
    const p = buildRliPayload(
      lease({ cedolareSecca: true, type: 'CONCORDATO_3_2', durationMonths: 36 }),
    );
    expect(p.adempimento).toBe('REGISTRAZIONE');
    expect(p.cedolareRate).toBe(0.1);
    expect(p.taxes.totalCents).toBe(0);
    expect(p.registrationDeadline).toBe('2026-10-01');
  });
});
