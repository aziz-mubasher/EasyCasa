import Constants from 'expo-constants';

type Extra = {
  apiBaseUrl?: string;
  oidcIssuer?: string;
  oidcClientId?: string;
  webAppUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing config: ${name}`);
  return value;
}

export const config = {
  apiBaseUrl: required(
    'apiBaseUrl',
    process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl,
  ),
  oidcIssuer: required(
    'oidcIssuer',
    process.env.EXPO_PUBLIC_OIDC_ISSUER ?? extra.oidcIssuer,
  ),
  oidcClientId: required(
    'oidcClientId',
    process.env.EXPO_PUBLIC_OIDC_CLIENT_ID ?? extra.oidcClientId,
  ),
  webAppUrl: process.env.EXPO_PUBLIC_WEB_APP_URL ?? extra.webAppUrl ?? '',
} as const;
