import { apiBaseUrl } from './config';

type TokenGetter = () => Promise<string | null>;

export function createAuthedFetch(getAccessToken: TokenGetter): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    const token = await getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };
}

export function apiUrl(path: string): string {
  const base = apiBaseUrl.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
