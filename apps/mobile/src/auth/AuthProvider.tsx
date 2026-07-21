import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { config } from '../config';
import { tokenStore } from './tokenStore';

WebBrowser.maybeCompleteAuthSession();

const ACCESS_KEY = 'ec.access';
const REFRESH_KEY = 'ec.refresh';
const EXPIRY_KEY = 'ec.expiry';

interface Tokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // epoch ms
}

interface AuthState {
  ready: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

const redirectUri = AuthSession.makeRedirectUri({ scheme: 'easycasa', path: 'auth' });

async function persist(tokens: Tokens): Promise<void> {
  await tokenStore.set(ACCESS_KEY, tokens.accessToken);
  await tokenStore.set(EXPIRY_KEY, String(tokens.expiresAt));
  if (tokens.refreshToken) await tokenStore.set(REFRESH_KEY, tokens.refreshToken);
}

async function clear(): Promise<void> {
  await tokenStore.remove(ACCESS_KEY);
  await tokenStore.remove(REFRESH_KEY);
  await tokenStore.remove(EXPIRY_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const discovery = AuthSession.useAutoDiscovery(config.oidcIssuer);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [ready, setReady] = useState(false);

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: config.oidcClientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      usePKCE: true,
    },
    discovery,
  );

  // Rehydrate tokens on boot.
  useEffect(() => {
    (async () => {
      const [access, refresh, expiry] = await Promise.all([
        tokenStore.get(ACCESS_KEY),
        tokenStore.get(REFRESH_KEY),
        tokenStore.get(EXPIRY_KEY),
      ]);
      if (access && expiry) {
        setTokens({ accessToken: access, refreshToken: refresh, expiresAt: Number(expiry) });
      }
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async () => {
    if (!discovery || !request) return;
    const result = await promptAsync();
    if (result.type !== 'success' || !result.params.code) return;

    const exchanged = await AuthSession.exchangeCodeAsync(
      {
        clientId: config.oidcClientId,
        code: result.params.code,
        redirectUri,
        extraParams: request.codeVerifier
          ? { code_verifier: request.codeVerifier }
          : {},
      },
      discovery,
    );

    const next: Tokens = {
      accessToken: exchanged.accessToken,
      refreshToken: exchanged.refreshToken ?? null,
      expiresAt: Date.now() + (exchanged.expiresIn ?? 300) * 1000,
    };
    await persist(next);
    setTokens(next);
  }, [discovery, request, promptAsync]);

  const signOut = useCallback(async () => {
    await clear();
    setTokens(null);
    if (discovery?.end_session_endpoint) {
      const params = new URLSearchParams({
        client_id: config.oidcClientId,
        post_logout_redirect_uri: config.webAppUrl || AuthSession.makeRedirectUri({ scheme: 'easycasa', path: 'auth' }),
      });
      await WebBrowser.openAuthSessionAsync(
        `${discovery.end_session_endpoint}?${params.toString()}`,
        config.webAppUrl || redirectUri,
      );
    }
  }, [discovery]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!tokens) return null;
    const stillValid = tokens.expiresAt - Date.now() > 30_000;
    if (stillValid) return tokens.accessToken;

    // Refresh if we can; otherwise force re-auth.
    if (discovery && tokens.refreshToken) {
      try {
        const refreshed = await AuthSession.refreshAsync(
          { clientId: config.oidcClientId, refreshToken: tokens.refreshToken },
          discovery,
        );
        const next: Tokens = {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
          expiresAt: Date.now() + (refreshed.expiresIn ?? 300) * 1000,
        };
        await persist(next);
        setTokens(next);
        return next.accessToken;
      } catch {
        await signOut();
        return null;
      }
    }
    await signOut();
    return null;
  }, [tokens, discovery, signOut]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      isAuthenticated: tokens !== null,
      signIn,
      signOut,
      getAccessToken,
    }),
    [ready, tokens, signIn, signOut, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
