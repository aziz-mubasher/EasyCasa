import type { ListingSummary } from '@easycasa/shared';

import { apiUrl } from '@/auth/authedFetch';

export type AlertFrequency = 'instant' | 'daily' | 'off';

export type SavedSearchRow = {
  id: string;
  userId: string;
  name: string;
  criteria: Record<string, unknown>;
  frequency: AlertFrequency;
  lastRunAt: string | null;
};

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function authHeaders(token: string, init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

export async function fetchFavorites(fetchFn: typeof fetch, token: string): Promise<ListingSummary[]> {
  const res = await fetchFn(apiUrl('/me/favorites'), {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`GET /me/favorites → ${res.status}`);
  const json = (await parseJson(res)) as ListingSummary[];
  return json.map((row) => ({
    ...row,
    imageUrls:
      row.imageUrls && row.imageUrls.length > 0
        ? row.imageUrls
        : row.coverUrl
          ? [row.coverUrl]
          : [],
  }));
}

export async function addFavorite(
  fetchFn: typeof fetch,
  token: string,
  listingId: string,
): Promise<void> {
  const res = await fetchFn(apiUrl(`/me/favorites/${encodeURIComponent(listingId)}`), {
    method: 'PUT',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`PUT /me/favorites/${listingId} → ${res.status}`);
}

export async function removeFavorite(
  fetchFn: typeof fetch,
  token: string,
  listingId: string,
): Promise<void> {
  const res = await fetchFn(apiUrl(`/me/favorites/${encodeURIComponent(listingId)}`), {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`DELETE /me/favorites/${listingId} → ${res.status}`);
}

export async function fetchSavedSearches(fetchFn: typeof fetch, token: string): Promise<SavedSearchRow[]> {
  const res = await fetchFn(apiUrl('/me/saved-searches'), {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`GET /me/saved-searches → ${res.status}`);
  return (await parseJson(res)) as SavedSearchRow[];
}

export async function createSavedSearch(
  fetchFn: typeof fetch,
  token: string,
  body: { name: string; criteria: Record<string, unknown>; frequency: AlertFrequency },
): Promise<SavedSearchRow> {
  const res = await fetchFn(apiUrl('/me/saved-searches'), {
    method: 'POST',
    headers: authHeaders(token, { body: JSON.stringify(body) }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST /me/saved-searches → ${res.status}`);
  return (await parseJson(res)) as SavedSearchRow;
}

export async function setSavedSearchFrequency(
  fetchFn: typeof fetch,
  token: string,
  id: string,
  frequency: AlertFrequency,
): Promise<SavedSearchRow> {
  const res = await fetchFn(apiUrl(`/me/saved-searches/${encodeURIComponent(id)}/frequency`), {
    method: 'PUT',
    headers: authHeaders(token, { body: JSON.stringify({ frequency }) }),
    body: JSON.stringify({ frequency }),
  });
  if (!res.ok) throw new Error(`PUT /me/saved-searches/${id}/frequency → ${res.status}`);
  return (await parseJson(res)) as SavedSearchRow;
}

export async function deleteSavedSearch(fetchFn: typeof fetch, token: string, id: string): Promise<void> {
  const res = await fetchFn(apiUrl(`/me/saved-searches/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`DELETE /me/saved-searches/${id} → ${res.status}`);
}
