import { describe, expect, it } from 'vitest';

import type { Viewing } from '../../viewings/domain/types';
import { viewingForConductor, viewingForSeeker } from './viewing.serializer';

const base: Viewing = {
  id: 'v1',
  listingId: 'l1',
  seekerUserId: 's1',
  conductorUserId: 'c1',
  enquiryId: null,
  startMs: 1,
  endMs: 2,
  status: 'REQUESTED',
  icsSequence: 0,
  address: 'Via Roma 1',
  areaLabel: 'Navigli',
  listingTitle: 'Trilocale',
  b4aBandMaxCents: 350_000_00,
  b4aExpiresAt: '2027-01-01',
};

describe('viewing serializers (EC-11 progressive disclosure)', () => {
  it('hides address from seeker before confirm', () => {
    const v = viewingForSeeker(base);
    expect(v.address).toBeNull();
  });

  it('reveals address to seeker after confirm', () => {
    const v = viewingForSeeker({ ...base, status: 'CONFIRMED' });
    expect(v.address).toBe('Via Roma 1');
  });

  it('conductor always sees address; band never on seeker DTO', () => {
    const c = viewingForConductor(base);
    expect(c.address).toBe('Via Roma 1');
    expect(c.b4aBandMaxCents).toBe(350_000_00);
    const s = viewingForSeeker(base) as Record<string, unknown>;
    expect('b4aBandMaxCents' in s).toBe(false);
  });
});
