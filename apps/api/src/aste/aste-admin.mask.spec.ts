import { describe, expect, it } from 'vitest';

import {
  failureReasonCategory,
  maskFilename,
  opaqueUserRef,
} from './aste-admin.mask';

describe('aste-admin.mask (EC-26)', () => {
  it('opaqueUserRef is stable and not the raw uuid', () => {
    const id = '11111111-2222-3333-4444-555555555555';
    const a = opaqueUserRef(id, 'secret-sixteen-chars');
    const b = opaqueUserRef(id, 'secret-sixteen-chars');
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
    expect(a).not.toContain(id);
    expect(opaqueUserRef(id, 'other-secret-xxxxx')).not.toBe(a);
  });

  it('maskFilename keeps extension and first char', () => {
    expect(maskFilename('perizia_ctu_roma.pdf')).toMatch(/^p•+\.pdf$/);
    expect(maskFilename('a.pdf')).toBe('•.pdf');
    expect(maskFilename('ab.pdf')).toBe('a•.pdf');
    expect(maskFilename(null)).toBe('••');
    expect(maskFilename('noext')).toMatch(/^n•+$/);
  });

  it('failureReasonCategory maps known prefixes', () => {
    expect(failureReasonCategory('stale_processing_exhausted')).toBe('stale');
    expect(failureReasonCategory('ocr_failed')).toBe('ocr');
    expect(failureReasonCategory('extract_schema_invalid')).toBe('extract');
    expect(failureReasonCategory('no_documents')).toBe('no_documents');
    expect(failureReasonCategory(null)).toBeNull();
  });
});
