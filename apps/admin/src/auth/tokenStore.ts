const ACCESS_KEY = 'ec.admin.access';
const REFRESH_KEY = 'ec.admin.refresh';
const EXPIRY_KEY = 'ec.admin.expiry';
const PKCE_VERIFIER_KEY = 'ec.admin.pkce_verifier';
const OAUTH_STATE_KEY = 'ec.admin.oauth_state';
const RETURN_TO_KEY = 'ec.admin.return_to';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

export const tokenStore = {
  getTokens(): StoredTokens | null {
    const s = storage();
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
    const s = storage();
    if (!s) return;
    s.setItem(ACCESS_KEY, tokens.accessToken);
    s.setItem(EXPIRY_KEY, String(tokens.expiresAt));
    if (tokens.refreshToken) s.setItem(REFRESH_KEY, tokens.refreshToken);
    else s.removeItem(REFRESH_KEY);
  },

  clearTokens(): void {
    const s = storage();
    if (!s) return;
    s.removeItem(ACCESS_KEY);
    s.removeItem(REFRESH_KEY);
    s.removeItem(EXPIRY_KEY);
  },

  setPkceVerifier(verifier: string): void {
    storage()?.setItem(PKCE_VERIFIER_KEY, verifier);
  },

  getPkceVerifier(): string | null {
    return storage()?.getItem(PKCE_VERIFIER_KEY) ?? null;
  },

  clearPkceVerifier(): void {
    storage()?.removeItem(PKCE_VERIFIER_KEY);
  },

  setOAuthState(state: string): void {
    storage()?.setItem(OAUTH_STATE_KEY, state);
  },

  getOAuthState(): string | null {
    return storage()?.getItem(OAUTH_STATE_KEY) ?? null;
  },

  clearOAuthState(): void {
    storage()?.removeItem(OAUTH_STATE_KEY);
  },

  setReturnTo(path: string): void {
    storage()?.setItem(RETURN_TO_KEY, path);
  },

  consumeReturnTo(): string {
    const s = storage();
    const path = s?.getItem(RETURN_TO_KEY) ?? '/';
    s?.removeItem(RETURN_TO_KEY);
    return path;
  },
};
