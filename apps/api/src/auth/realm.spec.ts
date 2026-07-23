import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

type ClientScope = {
  name: string;
  protocolMappers?: Array<{
    name?: string;
    protocolMapper?: string;
    config?: Record<string, string>;
  }>;
};

type RealmClient = {
  clientId: string;
  bearerOnly?: boolean;
  publicClient?: boolean;
  redirectUris?: string[];
  attributes?: Record<string, string>;
  defaultClientScopes?: string[];
  optionalClientScopes?: string[];
};

type RealmJson = {
  roles: { realm: Array<{ name: string }> };
  clients: RealmClient[];
  clientScopes: ClientScope[];
  defaultDefaultClientScopes?: string[];
  defaultOptionalClientScopes?: string[];
};

const realm = JSON.parse(
  readFileSync(path.resolve(process.cwd(), '../../infra/keycloak/realm-easycasa.json'), 'utf8'),
) as RealmJson;

const REQUIRED_BUILTIN_SCOPES = [
  'basic',
  'profile',
  'email',
  'roles',
  'web-origins',
  'acr',
  'offline_access',
] as const;

const OIDC_LOGIN_SCOPES = ['basic', 'profile', 'email', 'roles', 'web-origins', 'acr', 'easycasa-audience'];

function scope(name: string): ClientScope | undefined {
  return realm.clientScopes.find((s) => s.name === name);
}

function mapper(scopeName: string, predicate: (m: NonNullable<ClientScope['protocolMappers']>[number]) => boolean) {
  return scope(scopeName)?.protocolMappers?.find(predicate);
}

describe('realm-easycasa.json', () => {
  it('defines shared UserRole names + professional', () => {
    const names = realm.roles.realm.map((r) => r.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'buyer',
        'seeker',
        'seller',
        'agent',
        'partner',
        'pro_marketer',
        'professional',
        'admin',
      ]),
    );
    expect(names).not.toContain('pro-marketer');
  });

  it('declares standard OIDC client scopes with protocol mappers (not empty shells)', () => {
    for (const name of REQUIRED_BUILTIN_SCOPES) {
      expect(scope(name), `missing client scope ${name}`).toBeDefined();
    }
    expect(scope('easycasa-audience')).toBeDefined();

    expect(scope('profile')?.protocolMappers?.length).toBeGreaterThan(0);
    expect(scope('email')?.protocolMappers?.length).toBeGreaterThan(0);
    expect(scope('roles')?.protocolMappers?.length).toBeGreaterThan(0);
    expect(scope('basic')?.protocolMappers?.length).toBeGreaterThan(0);
  });

  it('maps sub via the basic scope (Keycloak 26 oidc-sub-mapper)', () => {
    const subMapper = mapper('basic', (m) => m.protocolMapper === 'oidc-sub-mapper');
    expect(subMapper).toBeDefined();
    expect(subMapper?.config?.['access.token.claim']).toBe('true');
  });

  it('maps realm roles to realm_access.roles via the roles scope', () => {
    const rolesMapper = mapper(
      'roles',
      (m) =>
        m.protocolMapper === 'oidc-usermodel-realm-role-mapper' &&
        m.config?.['claim.name'] === 'realm_access.roles',
    );
    expect(rolesMapper).toBeDefined();
    expect(rolesMapper?.config?.['access.token.claim']).toBe('true');
    expect(rolesMapper?.config?.multivalued).toBe('true');
  });

  it('maps easycasa-api into access-token audience', () => {
    const audienceMapper = mapper(
      'easycasa-audience',
      (m) => m.config?.['included.client.audience'] === 'easycasa-api',
    );
    expect(audienceMapper?.protocolMapper).toBe('oidc-audience-mapper');
    expect(audienceMapper?.config?.['access.token.claim']).toBe('true');
  });

  it('emits email and preferred_username claims from profile/email scopes', () => {
    const emailMapper = mapper(
      'email',
      (m) => m.config?.['claim.name'] === 'email' && m.config?.['access.token.claim'] === 'true',
    );
    expect(emailMapper).toBeDefined();

    const usernameMapper = mapper(
      'profile',
      (m) => m.config?.['claim.name'] === 'preferred_username' && m.config?.['access.token.claim'] === 'true',
    );
    expect(usernameMapper).toBeDefined();
  });

  it('has bearer-only API audience client and PKCE web client', () => {
    const api = realm.clients.find((c) => c.clientId === 'easycasa-api');
    expect(api?.bearerOnly).toBe(true);

    const web = realm.clients.find((c) => c.clientId === 'easycasa-web');
    expect(web?.publicClient).toBe(true);
    expect(web?.attributes?.['pkce.code.challenge.method']).toBe('S256');
  });

  it('assigns OIDC login scopes to easycasa-web (openid/profile/email resolve)', () => {
    const web = realm.clients.find((c) => c.clientId === 'easycasa-web');
    expect(web?.defaultClientScopes).toEqual(expect.arrayContaining(['basic', 'profile', 'email', 'roles']));
    expect(web?.defaultClientScopes).toEqual(expect.arrayContaining(['easycasa-audience']));
    expect(web?.optionalClientScopes).toContain('offline_access');
  });

  it('assigns the same OIDC scopes to easycasa-admin and mobile clients', () => {
    for (const clientId of ['easycasa-admin', 'easycasa-mobile', 'easycasa-app']) {
      const client = realm.clients.find((c) => c.clientId === clientId);
      expect(client?.defaultClientScopes).toEqual(expect.arrayContaining(OIDC_LOGIN_SCOPES));
      expect(client?.optionalClientScopes).toContain('offline_access');
    }
  });

  it('sets realm default client scopes so new clients inherit OIDC claims', () => {
    expect(realm.defaultDefaultClientScopes).toEqual(expect.arrayContaining(['basic', 'profile', 'email', 'roles']));
    expect(realm.defaultOptionalClientScopes).toContain('offline_access');
  });

  it('includes production redirect URIs for web, admin, and Expo', () => {
    const web = realm.clients.find((c) => c.clientId === 'easycasa-web');
    expect(web?.redirectUris).toEqual(
      expect.arrayContaining([
        'https://easycasaita.com/auth/callback',
        'http://localhost:3000/auth/callback',
      ]),
    );
    const admin = realm.clients.find((c) => c.clientId === 'easycasa-admin');
    expect(admin?.redirectUris).toEqual(
      expect.arrayContaining(['https://admin.easycasaita.com/*']),
    );
    const mobile = realm.clients.find((c) => c.clientId === 'easycasa-app');
    expect(mobile?.redirectUris).toEqual(expect.arrayContaining(['easycasa://auth/*']));
  });
});
