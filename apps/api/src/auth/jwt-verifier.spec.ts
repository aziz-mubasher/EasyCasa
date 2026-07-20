import { SignJWT, exportJWK, generateKeyPair, createLocalJWKSet } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import type { ApiConfig } from '../config';
import { JwtVerifier, extractRoles } from './jwt-verifier';
import type { JwksResolver } from './jwks.provider';

const ISSUER = 'https://kc.easycasa.test/realms/easycasa';
const AUDIENCE = 'easycasa-api';
const KID = 'test-key-1';

let sign: (
  claims: Record<string, unknown>,
  overrides?: { exp?: string; aud?: string; iss?: string },
) => Promise<string>;
let resolver: JwksResolver;
let verifier: JwtVerifier;

function cfg(over: Partial<ApiConfig> = {}): ApiConfig {
  return {
    OIDC_ISSUER: ISSUER,
    OIDC_AUDIENCE: AUDIENCE,
    OIDC_ROLES_CLAIM: 'realm_access.roles',
    OIDC_JWKS_URL: 'https://kc.easycasa.test/jwks',
    DEV_AUTH: false,
    ...over,
  } as ApiConfig;
}

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const pubJwk = await exportJWK(publicKey);
  pubJwk.kid = KID;
  pubJwk.alg = 'RS256';
  resolver = createLocalJWKSet({ keys: [pubJwk] }) as unknown as JwksResolver;

  sign = (claims, overrides = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: KID })
      .setIssuedAt()
      .setIssuer(overrides.iss ?? ISSUER)
      .setAudience(overrides.aud ?? AUDIENCE)
      .setExpirationTime(overrides.exp ?? '5m')
      .sign(privateKey);

  verifier = new JwtVerifier(cfg(), resolver);
});

describe('JwtVerifier (real RS256 crypto)', () => {
  it('accepts a valid token and maps sub/email/roles', async () => {
    const token = await sign({
      sub: 'user-123',
      email: 'seeker@example.it',
      realm_access: { roles: ['buyer', 'seller'] },
    });
    const p = await verifier.verify(token);
    expect(p).toEqual({
      sub: 'user-123',
      email: 'seeker@example.it',
      roles: ['buyer', 'seller'],
    });
  });

  it('rejects a token with the wrong audience', async () => {
    const token = await sign({ sub: 'u1' }, { aud: 'some-other-api' });
    await expect(verifier.verify(token)).rejects.toThrow('invalid token');
  });

  it('rejects a token from the wrong issuer', async () => {
    const token = await sign({ sub: 'u1' }, { iss: 'https://evil.example/realms/x' });
    await expect(verifier.verify(token)).rejects.toThrow('invalid token');
  });

  it('rejects an expired token', async () => {
    const token = await sign({ sub: 'u1' }, { exp: '-1s' });
    await expect(verifier.verify(token)).rejects.toThrow('invalid token');
  });

  it('rejects a token signed by an unknown key', async () => {
    const { privateKey: rogue } = await generateKeyPair('RS256');
    const token = await new SignJWT({ sub: 'u1' })
      .setProtectedHeader({ alg: 'RS256', kid: 'rogue' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('5m')
      .sign(rogue);
    await expect(verifier.verify(token)).rejects.toThrow('invalid token');
  });

  it('honors a custom roles claim path', async () => {
    const v = new JwtVerifier(cfg({ OIDC_ROLES_CLAIM: 'easycasa.roles' }), resolver);
    const token = await sign({ sub: 'u1', easycasa: { roles: ['agent'] } });
    expect((await v.verify(token)).roles).toEqual(['agent']);
  });

  it('defaults roles to [] when the claim is absent or malformed', async () => {
    const token = await sign({ sub: 'u1' });
    expect((await verifier.verify(token)).roles).toEqual([]);
  });
});

describe('extractRoles', () => {
  it('walks dotted paths and filters non-strings', () => {
    expect(extractRoles({ a: { b: ['x', 1, 'y'] } } as never, 'a.b')).toEqual(['x', 'y']);
    expect(extractRoles({} as never, 'a.b')).toEqual([]);
  });
});
