import { oidcConfig } from './config';

export interface OidcDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
}

let cachedDiscovery: OidcDiscovery | null = null;

export async function loadDiscovery(): Promise<OidcDiscovery> {
  if (cachedDiscovery) return cachedDiscovery;
  const issuer = oidcConfig.issuer.replace(/\/$/, '');
  const res = await fetch(`${issuer}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error(`OIDC discovery failed (${res.status})`);
  cachedDiscovery = (await res.json()) as OidcDiscovery;
  return cachedDiscovery;
}

export async function buildAuthorizeUrl(input: {
  state: string;
  codeChallenge: string;
}): Promise<string> {
  const discovery = await loadDiscovery();
  const params = new URLSearchParams({
    client_id: oidcConfig.clientId,
    redirect_uri: oidcConfig.redirectUri,
    response_type: 'code',
    scope: oidcConfig.scopes.join(' '),
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${discovery.authorization_endpoint}?${params.toString()}`;
}

export async function exchangeCode(input: {
  code: string;
  codeVerifier: string;
}): Promise<{ accessToken: string; refreshToken: string | null; expiresIn: number }> {
  const discovery = await loadDiscovery();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: oidcConfig.clientId,
    code: input.code,
    redirect_uri: oidcConfig.redirectUri,
    code_verifier: input.codeVerifier,
  });
  const res = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresIn: json.expires_in ?? 300,
  };
}

export async function refreshTokens(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
}> {
  const discovery = await loadDiscovery();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: oidcConfig.clientId,
    refresh_token: refreshToken,
  });
  const res = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed (${res.status})`);
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresIn: json.expires_in ?? 300,
  };
}

export async function buildLogoutUrl(idTokenHint?: string): Promise<string | null> {
  const discovery = await loadDiscovery();
  if (!discovery.end_session_endpoint) return null;
  const params = new URLSearchParams({
    client_id: oidcConfig.clientId,
    post_logout_redirect_uri: oidcConfig.siteUrl,
  });
  if (idTokenHint) params.set('id_token_hint', idTokenHint);
  return `${discovery.end_session_endpoint}?${params.toString()}`;
}
