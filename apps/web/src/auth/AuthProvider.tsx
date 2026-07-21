'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { isOidcConfigured } from './config';
import { buildAuthorizeUrl, buildLogoutUrl, exchangeCode, refreshTokens } from './oidc';
import { pkceChallengeFromVerifier, randomString } from './pkce';
import { tokenStore, type StoredTokens } from './tokenStore';

interface AuthState {
  ready: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  signIn: (returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const [ready, setReady] = useState(false);
  const isConfigured = isOidcConfigured();

  useEffect(() => {
    setTokens(tokenStore.getTokens());
    setReady(true);
  }, []);

  const persist = useCallback((next: StoredTokens) => {
    tokenStore.setTokens(next);
    setTokens(next);
  }, []);

  const signIn = useCallback(async (returnTo = '/') => {
    if (!isConfigured) throw new Error('OIDC is not configured');
    const state = randomString(16);
    const verifier = randomString(32);
    const challenge = await pkceChallengeFromVerifier(verifier);
    tokenStore.setOAuthState(state);
    tokenStore.setPkceVerifier(verifier);
    tokenStore.setReturnTo(returnTo);
    const url = await buildAuthorizeUrl({ state, codeChallenge: challenge });
    window.location.assign(url);
  }, [isConfigured]);

  const signOut = useCallback(async () => {
    tokenStore.clearTokens();
    setTokens(null);
    if (!isConfigured) return;
    const logoutUrl = await buildLogoutUrl().catch(() => null);
    if (logoutUrl) window.location.assign(logoutUrl);
  }, [isConfigured]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!tokens) return null;
    if (tokens.expiresAt - Date.now() > 30_000) return tokens.accessToken;
    if (!tokens.refreshToken || !isConfigured) {
      await signOut();
      return null;
    }
    try {
      const refreshed = await refreshTokens(tokens.refreshToken);
      const next: StoredTokens = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: Date.now() + refreshed.expiresIn * 1000,
      };
      persist(next);
      return next.accessToken;
    } catch {
      await signOut();
      return null;
    }
  }, [tokens, isConfigured, persist, signOut]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      isAuthenticated: tokens !== null,
      isConfigured,
      signIn,
      signOut,
      getAccessToken,
    }),
    [ready, tokens, isConfigured, signIn, signOut, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Completes the authorization-code + PKCE callback. */
export async function completeOAuthCallback(params: URLSearchParams): Promise<string> {
  const code = params.get('code');
  const state = params.get('state');
  if (!code) throw new Error('Missing authorization code');
  const expectedState = tokenStore.getOAuthState();
  if (!state || !expectedState || state !== expectedState) {
    throw new Error('Invalid OAuth state');
  }
  const verifier = tokenStore.getPkceVerifier();
  if (!verifier) throw new Error('Missing PKCE verifier');
  const exchanged = await exchangeCode({ code, codeVerifier: verifier });
  tokenStore.clearOAuthState();
  tokenStore.clearPkceVerifier();
  tokenStore.setTokens({
    accessToken: exchanged.accessToken,
    refreshToken: exchanged.refreshToken,
    expiresAt: Date.now() + exchanged.expiresIn * 1000,
  });
  return tokenStore.consumeReturnTo();
}
