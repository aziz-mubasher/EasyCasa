import { describe, expect, it } from 'vitest';

import type { Professional } from '../../professionals/domain/types';
import { professionalForSupport, professionalFull } from './professional.serializer';

const sample: Professional = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  displayName: 'Mario Rossi',
  coverageProvinces: ['BS'],
  credentials: [
    {
      type: 'REA_MEDIATORE',
      status: 'VERIFIED',
      reference: 'MI-12345',
      documentUrl: 'https://example.com/doc.pdf',
      expiresAt: '2027-01-01',
    },
  ],
  activeAssignments: 0,
  maxConcurrent: 3,
};

describe('professionalForSupport (EC-14)', () => {
  it('masks name and credential PII but keeps status/coverage', () => {
    const out = professionalForSupport(sample);
    expect(out.redacted).toBe(true);
    expect(out.displayName).not.toContain('Mario');
    expect(out.coverageProvinces).toEqual(['BS']);
    expect(out.credentials[0]?.status).toBe('VERIFIED');
    expect(out.credentials[0]?.reference).toBeUndefined();
    expect(out.credentials[0]?.documentUrl).toBeUndefined();
  });

  it('full projection keeps references', () => {
    const out = professionalFull(sample);
    expect(out.redacted).toBe(false);
    expect(out.displayName).toBe('Mario Rossi');
    expect(out.credentials[0]?.reference).toBe('MI-12345');
  });
});
