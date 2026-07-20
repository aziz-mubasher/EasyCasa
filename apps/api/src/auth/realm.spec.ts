import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('easycasa-realm.json', () => {
  const realm = JSON.parse(
    readFileSync(path.resolve(process.cwd(), '../../infra/keycloak/easycasa-realm.json'), 'utf8'),
  ) as {
    roles: { realm: Array<{ name: string }> };
    clients: Array<{
      clientId: string;
      bearerOnly?: boolean;
      publicClient?: boolean;
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
});
