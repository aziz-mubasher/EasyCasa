/**
 * EC-S-T30 — consent version decision helpers (imported from @easycasa/shared).
 * Shared package has no vitest; brief cases live here.
 */
import { describe, expect, it } from 'vitest';
import {
  buildAcceptance,
  consentDecision,
  mayProceed,
  parsePolicyVersion,
} from '@easycasa/shared';

describe('parsePolicyVersion', () => {
  it('accepts v1.0 and 2.13', () => {
    expect(parsePolicyVersion('v1.0')).toEqual({ major: 1, minor: 0 });
    expect(parsePolicyVersion('2.13')).toEqual({ major: 2, minor: 13 });
  });

  it('rejects drafts, empty, and free-form', () => {
    expect(parsePolicyVersion('')).toBeNull();
    expect(parsePolicyVersion('   ')).toBeNull();
    expect(parsePolicyVersion('v1-draft')).toBeNull();
    expect(parsePolicyVersion('v1')).toBeNull();
    expect(parsePolicyVersion('1.0.0')).toBeNull();
  });
});

describe('consentDecision', () => {
  it('same → ok', () => {
    expect(consentDecision('v1.0', 'v1.0')).toBe('ok');
    expect(consentDecision('1.2', 'v1.2')).toBe('ok');
  });

  it('minor bump → notice', () => {
    expect(consentDecision('v1.0', 'v1.1')).toBe('notice');
    expect(consentDecision('2.0', '2.13')).toBe('notice');
  });

  it('major bump → reacceptance_required', () => {
    expect(consentDecision('v1.9', 'v2.0')).toBe('reacceptance_required');
  });

  it('accepted newer → invalid', () => {
    expect(consentDecision('v2.0', 'v1.5')).toBe('invalid');
    expect(consentDecision('v1.5', 'v1.2')).toBe('invalid');
  });

  it('unparseable → invalid', () => {
    expect(consentDecision('v1-draft', 'v1.0')).toBe('invalid');
    expect(consentDecision('v1.0', '')).toBe('invalid');
    expect(consentDecision(null, 'v1.0')).toBe('invalid');
  });
});

describe('mayProceed', () => {
  it('ok|notice true; reacceptance_required|invalid false', () => {
    expect(mayProceed('ok')).toBe(true);
    expect(mayProceed('notice')).toBe(true);
    expect(mayProceed('reacceptance_required')).toBe(false);
    expect(mayProceed('invalid')).toBe(false);
  });
});

describe('buildAcceptance', () => {
  it('returns trimmed version + acceptedAt when parseable', () => {
    const at = new Date('2026-08-11T12:00:00Z');
    expect(buildAcceptance(' v1.0 ', at)).toEqual({
      policyVersion: 'v1.0',
      acceptedAt: at,
    });
  });

  it('refuses unparseable', () => {
    expect(buildAcceptance('')).toBeNull();
    expect(buildAcceptance('v1-draft')).toBeNull();
  });
});
