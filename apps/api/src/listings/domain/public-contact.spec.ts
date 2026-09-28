import { describe, expect, it } from 'vitest';

import {
  credentialAllowsPublicPhone,
  publicPhone,
  publicSlug,
  type StoredCredential,
} from './public-contact';

const NOW = new Date('2026-09-28T12:00:00Z');

function cred(over: Partial<StoredCredential> = {}): StoredCredential {
  return {
    type: 'REA_MEDIATORE',
    status: 'verified',
    expiresAt: null,
    ...over,
  };
}

describe('credentialAllowsPublicPhone', () => {
  it('allows a verified REA with no expiry', () => {
    expect(credentialAllowsPublicPhone([cred()], NOW)).toBe(true);
  });

  it('allows a verified REA that has not expired', () => {
    expect(
      credentialAllowsPublicPhone([cred({ expiresAt: new Date('2027-01-01T00:00:00Z') })], NOW),
    ).toBe(true);
  });

  it('accepts the domain-layer VERIFIED spelling', () => {
    expect(credentialAllowsPublicPhone([cred({ status: 'VERIFIED' })], NOW)).toBe(true);
  });

  it('refuses pending, rejected, expired, and non-REA credentials', () => {
    expect(credentialAllowsPublicPhone([cred({ status: 'pending' })], NOW)).toBe(false);
    expect(credentialAllowsPublicPhone([cred({ status: 'rejected' })], NOW)).toBe(false);
    expect(
      credentialAllowsPublicPhone([cred({ expiresAt: new Date('2026-01-01T00:00:00Z') })], NOW),
    ).toBe(false);
    expect(credentialAllowsPublicPhone([cred({ type: 'ALBO_TECNICO' })], NOW)).toBe(false);
    expect(credentialAllowsPublicPhone([], NOW)).toBe(false);
  });
});

describe('publicPhone', () => {
  it('returns the phone only when the credential gate is open', () => {
    expect(publicPhone(' +39 030 111 ', true)).toBe('+39 030 111');
    expect(publicPhone('+39 030 111', false)).toBeNull();
    expect(publicPhone('   ', true)).toBeNull();
    expect(publicPhone(null, true)).toBeNull();
  });
});

describe('publicSlug', () => {
  it('drops OIDC slugs', () => {
    expect(publicSlug('oidc:abc')).toBeNull();
    expect(publicSlug('studio-rossi')).toBe('studio-rossi');
    expect(publicSlug(null)).toBeNull();
  });
});
