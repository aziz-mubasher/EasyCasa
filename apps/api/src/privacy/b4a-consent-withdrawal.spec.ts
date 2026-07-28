import { describe, expect, it, vi } from 'vitest';

import {
  ConsentService,
  CURRENT_POLICY_VERSION,
  type ConsentRecord,
  type ConsentStore,
} from './consent.service';
import { DataSubjectController } from './data-subject.controller';

/**
 * EC-3 §7 — withdrawing b4a_affordability_share clears attestation columns
 * and records the ledger entry for the dedicated purpose.
 */
class MemConsent implements ConsentStore {
  rows: ConsentRecord[] = [];
  async append(r: ConsentRecord) {
    this.rows.push(r);
  }
  async latest(subjectId: string, purpose: ConsentRecord['purpose']) {
    return (
      [...this.rows].reverse().find((r) => r.subjectId === subjectId && r.purpose === purpose) ??
      null
    );
  }
  async listForSubject(subjectId: string) {
    return this.rows.filter((r) => r.subjectId === subjectId);
  }
}

describe('b4a consent withdrawal (EC-3 §7)', () => {
  it('records withdrawal and clears four attestation columns', async () => {
    const store = new MemConsent();
    const consent = new ConsentService(store);
    await consent.record({
      subjectId: 'seeker-1',
      purpose: 'b4a_affordability_share',
      granted: true,
      policyVersion: CURRENT_POLICY_VERSION,
    });

    const clearBanks4AllAttestation = vi.fn(async () => 3);
    const enquiriesData = { clearBanks4AllAttestation };
    const users = {
      getOrCreate: vi.fn(async () => ({ id: 'seeker-1' })),
    };

    const ctrl = new DataSubjectController(
      {} as never,
      {} as never,
      consent,
      users as never,
      enquiriesData as never,
    );

    const res = await ctrl.recordConsent(
      { sub: 'oidc-sub', email: 's@x.it' } as never,
      {
        purpose: 'b4a_affordability_share',
        granted: false,
        policyVersion: CURRENT_POLICY_VERSION,
      } as never,
      { ip: '127.0.0.1' } as never,
    );

    expect(res.ok).toBe(true);
    expect(clearBanks4AllAttestation).toHaveBeenCalledWith('seeker-1');
    const latest = await store.latest('seeker-1', 'b4a_affordability_share');
    expect(latest?.granted).toBe(false);
    expect(latest?.purpose).toBe('b4a_affordability_share');
  });
});
