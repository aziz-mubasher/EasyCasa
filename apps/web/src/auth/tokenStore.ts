const ACCESS_KEY = 'ec.access';
const REFRESH_KEY = 'ec.refresh';
const EXPIRY_KEY = 'ec.expiry';
const PKCE_VERIFIER_KEY = 'ec.pkce_verifier';
const OAUTH_STATE_KEY = 'ec.oauth_state';
const RETURN_TO_KEY = 'ec.return_to';

/** Keys that identify the persisted app session (shared across tabs). */
export const TOKEN_STORAGE_KEYS = [ACCESS_KEY, REFRESH_KEY, EXPIRY_KEY] as const;

export interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

/**
 * Long-lived session tokens live in localStorage so a new tab stays signed in.
 * PKCE / OAuth handshake values stay in sessionStorage (same-tab redirect only).
 */
function sessionStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

function tokenPersistStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

/** One-time migrate from older sessionStorage-only sessions. */
function migrateTokensFromSession(): void {
  const ls = tokenPersistStore();
  const ss = sessionStore();
  if (!ls || !ss) return;
  if (ls.getItem(ACCESS_KEY)) return;
  const access = ss.getItem(ACCESS_KEY);
  const expiry = ss.getItem(EXPIRY_KEY);
  if (!access || !expiry) return;
  ls.setItem(ACCESS_KEY, access);
  ls.setItem(EXPIRY_KEY, expiry);
  const refresh = ss.getItem(REFRESH_KEY);
  if (refresh) ls.setItem(REFRESH_KEY, refresh);
  ss.removeItem(ACCESS_KEY);
  ss.removeItem(REFRESH_KEY);
  ss.removeItem(EXPIRY_KEY);
}

export const tokenStore = {
  getTokens(): StoredTokens | null {
    migrateTokensFromSession();
    const s = tokenPersistStore();
    if (!s) return null;
    const access = s.getItem(ACCESS_KEY);
    const expiry = s.getItem(EXPIRY_KEY);
    if (!access || !expiry) return null;
    return {
      accessToken: access,
      refreshToken: s.getItem(REFRESH_KEY),
      expiresAt: Number(expiry),
    };
  },

  setTokens(tokens: StoredTokens): void {
    const s = tokenPersistStore();
    if (!s) return;
    s.setItem(ACCESS_KEY, tokens.accessToken);
    s.setItem(EXPIRY_KEY, String(tokens.expiresAt));
    if (tokens.refreshToken) s.setItem(REFRESH_KEY, tokens.refreshToken);
    else s.removeItem(REFRESH_KEY);
    // Drop any leftover sessionStorage copy from older builds.
    const ss = sessionStore();
    ss?.removeItem(ACCESS_KEY);
    ss?.removeItem(REFRESH_KEY);
    ss?.removeItem(EXPIRY_KEY);
  },

  clearTokens(): void {
    const s = tokenPersistStore();
    if (s) {
      s.removeItem(ACCESS_KEY);
      s.removeItem(REFRESH_KEY);
      s.removeItem(EXPIRY_KEY);
    }
    const ss = sessionStore();
    ss?.removeItem(ACCESS_KEY);
    ss?.removeItem(REFRESH_KEY);
    ss?.removeItem(EXPIRY_KEY);
  },

  setPkceVerifier(verifier: string): void {
    sessionStore()?.setItem(PKCE_VERIFIER_KEY, verifier);
  },

  getPkceVerifier(): string | null {
    return sessionStore()?.getItem(PKCE_VERIFIER_KEY) ?? null;
  },

  clearPkceVerifier(): void {
    sessionStore()?.removeItem(PKCE_VERIFIER_KEY);
  },

  setOAuthState(state: string): void {
    sessionStore()?.setItem(OAUTH_STATE_KEY, state);
  },

  getOAuthState(): string | null {
    return sessionStore()?.getItem(OAUTH_STATE_KEY) ?? null;
  },

  clearOAuthState(): void {
    sessionStore()?.removeItem(OAUTH_STATE_KEY);
  },

  setReturnTo(path: string): void {
    sessionStore()?.setItem(RETURN_TO_KEY, path);
  },

  consumeReturnTo(): string {
    const s = sessionStore();
    const path = s?.getItem(RETURN_TO_KEY) ?? '/';
    s?.removeItem(RETURN_TO_KEY);
    return path;
  },
};
