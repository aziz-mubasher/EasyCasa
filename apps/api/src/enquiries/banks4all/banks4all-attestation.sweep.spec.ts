import { describe, expect, it, vi } from 'vitest';

import { Banks4AllAttestationSweep } from './banks4all-attestation.sweep';
import type { Banks4AllPort } from './banks4all.port';
import type { EnquiryRepository } from '../domain/ports';
import type { Enquiry } from '../domain/types';

function enq(over: Partial<Enquiry> = {}): Enquiry {
  return {
    id: 'e1',
    listingId: 'L1',
    seekerUserId: 'seek',
    ownerUserId: 'own',
    mediatorUserId: null,
    intent: 'info',
    status: 'NEW',
    message: 'hi',
    contactEmail: 'a@b.it',
    contactPhone: null,
    contactWhatsappAvailable: false,
    orderId: null,
    b4aToken: 'tokentokentokentoken',
    b4aBandMaxCents: 32500000,
    b4aExpiresAt: '2027-01-27',
    b4aCheckedAt: new Date(Date.now() - 48 * 3600_000).toISOString(),
    b4aHolderInitials: 'AB',
    b4aStatus: 'valid',
    ...over,
  };
}

describe('Banks4AllAttestationSweep', () => {
  it('clears on not_found and leaves alone on unavailable', async () => {
    const clearBanks4All = vi.fn();
    const setBanks4All = vi.fn();
    const repo = {
      listBanks4AllDueForSweep: async () => [enq({ id: 'a' }), enq({ id: 'b' })],
      clearBanks4All,
      setBanks4All,
    } as unknown as EnquiryRepository;

    const banks4all: Banks4AllPort = {
      async verify(token) {
        void token;
        return { ok: false, reason: 'not_found' };
      },
    };
    // First call not_found, second unavailable — use call count
    let n = 0;
    banks4all.verify = async () => {
      n += 1;
      return n === 1
        ? { ok: false, reason: 'not_found' }
        : { ok: false, reason: 'unavailable' };
    };

    const sweep = new Banks4AllAttestationSweep(repo, banks4all);
    const result = await sweep.runOnce();
    expect(result.cleared).toBe(1);
    expect(result.refreshed).toBe(0);
    expect(clearBanks4All).toHaveBeenCalledWith('a');
    expect(setBanks4All).not.toHaveBeenCalled();
  });
});
