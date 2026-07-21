const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const oidcConfig = {
  issuer: process.env.NEXT_PUBLIC_OIDC_ISSUER ?? '',
  clientId: process.env.NEXT_PUBLIC_OIDC_CLIENT_ID ?? 'easycasa-web',
  siteUrl,
  redirectUri: `${siteUrl.replace(/\/$/, '')}/auth/callback`,
  scopes: ['openid', 'profile', 'email', 'offline_access'],
} as const;

export function isOidcConfigured(): boolean {
  return Boolean(oidcConfig.issuer.trim() && oidcConfig.clientId.trim());
}

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';
