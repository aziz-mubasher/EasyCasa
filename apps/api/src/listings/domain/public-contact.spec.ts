import { describe, expect, it } from 'vitest';

import { agentForPublic } from '@easycasa/shared';

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

describe('agentForPublic', () => {
  const PRIVATE_PHONE = '+393339998877';
  const PRIVATE_EMAIL = 'private-seller@example.com';
  const AGENCY_PHONE = '+390301112233';

  it('copies a gated phone and never an email or a fallback phone', () => {
    const view = agentForPublic(
      {
        id: 'agent-1',
        displayName: 'Studio',
        phone: ` ${AGENCY_PHONE} `,
        slug: 'studio',
        bio: null,
        avatarUrl: null,
      },
      { phone: PRIVATE_PHONE, email: PRIVATE_EMAIL, displayName: 'Old' },
    );
    expect(view?.phone).toBe(AGENCY_PHONE);
    expect(view).not.toHaveProperty('email');
    expect(JSON.stringify(view)).not.toContain(PRIVATE_PHONE);
    expect(JSON.stringify(view)).not.toContain(PRIVATE_EMAIL);
  });

  it('drops the phone when the gated contact has none', () => {
    const view = agentForPublic(
      { id: 'seller-1', displayName: 'Mario', phone: null, slug: 'mario' },
      { phone: PRIVATE_PHONE, email: PRIVATE_EMAIL },
    );
    expect(view?.phone).toBeNull();
    expect(JSON.stringify(view)).not.toContain(PRIVATE_PHONE);
    expect(JSON.stringify(view)).not.toContain(PRIVATE_EMAIL);
  });
});

describe('publicSlug', () => {
  it('drops OIDC slugs', () => {
    expect(publicSlug('oidc:abc')).toBeNull();
    expect(publicSlug('studio-rossi')).toBe('studio-rossi');
    expect(publicSlug(null)).toBeNull();
  });
});
