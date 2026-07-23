const adminOrigin =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5174';

export const oidcConfig = {
  issuer: import.meta.env.VITE_OIDC_ISSUER ?? '',
  clientId: import.meta.env.VITE_OIDC_CLIENT_ID ?? 'easycasa-admin',
  siteUrl: adminOrigin,
  redirectUri: `${adminOrigin.replace(/\/$/, '')}/auth/callback`,
  scopes: ['openid', 'profile', 'email', 'offline_access'],
} as const;

export function isOidcConfigured(): boolean {
  return Boolean(oidcConfig.issuer.trim() && oidcConfig.clientId.trim());
}

export const devAuthEnabled = import.meta.env.VITE_DEV_AUTH === 'true';
