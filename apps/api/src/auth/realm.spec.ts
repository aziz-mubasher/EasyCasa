import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('realm-easycasa.json', () => {
  const realm = JSON.parse(
    readFileSync(path.resolve(process.cwd(), '../../infra/keycloak/realm-easycasa.json'), 'utf8'),
  ) as {
    roles: { realm: Array<{ name: string }> };
    clients: Array<{
      clientId: string;
      bearerOnly?: boolean;
      publicClient?: boolean;
      redirectUris?: string[];
      attributes?: Record<string, string>;
      defaultClientScopes?: string[];
    }>;
    clientScopes: Array<{
      name: string;
      protocolMappers?: Array<{ config?: Record<string, string> }>;
    }>;
  };

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

  it('has bearer-only API audience client and PKCE web client', () => {
    const api = realm.clients.find((c) => c.clientId === 'easycasa-api');
    expect(api?.bearerOnly).toBe(true);
    const web = realm.clients.find((c) => c.clientId === 'easycasa-web');
    expect(web?.publicClient).toBe(true);
    expect(web?.attributes?.['pkce.code.challenge.method']).toBe('S256');
    expect(web?.defaultClientScopes).toContain('easycasa-audience');
  });

  it('maps easycasa-api into access-token audience', () => {
    const scope = realm.clientScopes.find((s) => s.name === 'easycasa-audience');
    const mapper = scope?.protocolMappers?.find(
      (m) => m.config?.['included.client.audience'] === 'easycasa-api',
    );
    expect(mapper).toBeDefined();
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
