import { describe, expect, it } from 'vitest';

import { itemCoverageAvailability } from './coverage';
import type { Credential, Professional } from './types';

const NOW = new Date('2026-07-17T00:00:00Z');

function cred(type: Credential['type'], over: Partial<Credential> = {}): Credential {
  return { type, status: 'VERIFIED', ...over };
}

function pro(over: Partial<Professional> = {}): Professional {
  return {
    id: 'p1',
    displayName: 'Pro One',
    coverageProvinces: ['BS'],
    credentials: [],
    activeAssignments: 0,
    maxConcurrent: 5,
    ...over,
  };
}

describe('itemCoverageAvailability', () => {
  it('NONE credential is available in every province', () => {
    const r = itemCoverageAvailability('NONE', 'CR', [], NOW);
    expect(r.available).toBe(true);
    expect(r.capacityConstrained).toBe(false);
  });

  it('NONE credential is available without a province', () => {
    const r = itemCoverageAvailability('NONE', null, [], NOW);
    expect(r.available).toBe(true);
  });

  it('requires a province when a credential is required', () => {
    const r = itemCoverageAvailability('APE_CERTIFIER', '', [], NOW);
    expect(r.available).toBe(false);
    expect(r.reason).toBe('NO_PROVINCE');
  });

  it('unavailable where no professional covers the province', () => {
    const p = pro({
      coverageProvinces: ['BS'],
      credentials: [cred('APE_CERTIFIER')],
    });
    const r = itemCoverageAvailability('APE_CERTIFIER', 'CR', [p], NOW);
    expect(r.available).toBe(false);
    expect(r.reason).toBe('OUT_OF_COVERAGE');
  });

  it('available when a verified covering professional exists', () => {
    const p = pro({
      coverageProvinces: ['BS', 'CR'],
      credentials: [cred('APE_CERTIFIER')],
    });
    const r = itemCoverageAvailability('APE_CERTIFIER', 'CR', [p], NOW);
    expect(r.available).toBe(true);
    expect(r.qualifiedCount).toBe(1);
    expect(r.capacityConstrained).toBe(false);
  });

  it('expiring a credential flips availability off', () => {
    const p = pro({
      coverageProvinces: ['CR'],
      credentials: [cred('APE_CERTIFIER', { expiresAt: '2026-07-16T00:00:00Z' })],
    });
    const r = itemCoverageAvailability('APE_CERTIFIER', 'CR', [p], NOW);
    expect(r.available).toBe(false);
    expect(r.reason).toBe('ALL_EXPIRED_OR_UNVERIFIED');
  });

  it('all at max_concurrent → still available, capacityConstrained true', () => {
    const p = pro({
      coverageProvinces: ['CR'],
      credentials: [cred('APE_CERTIFIER')],
      activeAssignments: 5,
      maxConcurrent: 5,
    });
    const r = itemCoverageAvailability('APE_CERTIFIER', 'CR', [p], NOW);
    expect(r.available).toBe(true);
    expect(r.capacityConstrained).toBe(true);
    expect(r.availableCapacityCount).toBe(0);
  });
});
