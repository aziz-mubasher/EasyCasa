import { describe, expect, it } from 'vitest';

import { canAssign } from './eligibility';
import type { Credential, Professional, TaskContext } from './types';

const NOW = new Date('2026-07-17T00:00:00Z');

function cred(type: Credential['type'], over: Partial<Credential> = {}): Credential {
  return { type, status: 'VERIFIED', ...over };
}

function pro(over: Partial<Professional> = {}): Professional {
  return {
    id: 'p1',
    coverageProvinces: ['MI'],
    credentials: [],
    activeAssignments: 0,
    maxConcurrent: 5,
    ...over,
  };
}

const mediationTask: TaskContext = { requiredCredential: 'REA_MEDIATORE', province: 'MI' };

describe('canAssign', () => {
  it('mediator with verified REA + valid insurance + coverage → eligible', () => {
    const p = pro({
      credentials: [
        cred('REA_MEDIATORE', { reference: 'MI-12345' }),
        cred('RC_INSURANCE', { expiresAt: '2027-01-01' }),
      ],
    });
    expect(canAssign(p, mediationTask, NOW).allowed).toBe(true);
  });

  it('mediation blocked without RC insurance', () => {
    const p = pro({ credentials: [cred('REA_MEDIATORE')] });
    const r = canAssign(p, mediationTask, NOW);
    expect(r.allowed).toBe(false);
    expect(r.blockers.some((b) => b.code === 'MISSING_INSURANCE')).toBe(true);
  });

  it('mediation blocked with expired insurance', () => {
    const p = pro({
      credentials: [cred('REA_MEDIATORE'), cred('RC_INSURANCE', { expiresAt: '2025-01-01' })],
    });
    const r = canAssign(p, mediationTask, NOW);
    expect(r.blockers.some((b) => b.code === 'INSURANCE_EXPIRED')).toBe(true);
  });

  it('unverified REA enrolment blocks', () => {
    const p = pro({
      credentials: [
        cred('REA_MEDIATORE', { status: 'PENDING' }),
        cred('RC_INSURANCE', { expiresAt: '2027-01-01' }),
      ],
    });
    const r = canAssign(p, mediationTask, NOW);
    expect(r.blockers.some((b) => b.code === 'UNVERIFIED')).toBe(true);
  });

  it('out-of-coverage blocks', () => {
    const p = pro({
      coverageProvinces: ['RM'],
      credentials: [cred('REA_MEDIATORE'), cred('RC_INSURANCE', { expiresAt: '2027-01-01' })],
    });
    const r = canAssign(p, mediationTask, NOW);
    expect(r.blockers.some((b) => b.code === 'OUT_OF_COVERAGE')).toBe(true);
  });

  it('at capacity blocks', () => {
    const p = pro({
      activeAssignments: 5,
      maxConcurrent: 5,
      credentials: [cred('REA_MEDIATORE'), cred('RC_INSURANCE', { expiresAt: '2027-01-01' })],
    });
    const r = canAssign(p, mediationTask, NOW);
    expect(r.blockers.some((b) => b.code === 'AT_CAPACITY')).toBe(true);
  });

  it('tecnico task requires ALBO_TECNICO, not insurance', () => {
    const task: TaskContext = { requiredCredential: 'ALBO_TECNICO', province: 'MI' };
    const ok = pro({ credentials: [cred('ALBO_TECNICO', { reference: 'GEOM-99' })] });
    expect(canAssign(ok, task, NOW).allowed).toBe(true);
    const bad = pro({ credentials: [cred('REA_MEDIATORE')] });
    expect(canAssign(bad, task, NOW).blockers.some((b) => b.code === 'MISSING_CREDENTIAL')).toBe(
      true,
    );
  });

  it('NONE requirement → any in-coverage, under-capacity pro is eligible', () => {
    const task: TaskContext = { requiredCredential: 'NONE', province: 'MI' };
    expect(canAssign(pro(), task, NOW).allowed).toBe(true);
  });

  it('multiple blockers accumulate', () => {
    const task: TaskContext = { requiredCredential: 'REA_MEDIATORE', province: 'RM' };
    const p = pro({
      coverageProvinces: ['MI'],
      activeAssignments: 9,
      maxConcurrent: 5,
      credentials: [],
    });
    const r = canAssign(p, task, NOW);
    const codes = r.blockers.map((b) => b.code);
    expect(codes).toContain('OUT_OF_COVERAGE');
    expect(codes).toContain('AT_CAPACITY');
    expect(codes).toContain('MISSING_CREDENTIAL');
    expect(codes).toContain('MISSING_INSURANCE');
  });
});
