/**
 * Shared request primitive for the EasyCasa API client.
 *
 * Extracted so the Phase 8 owner API (and, optionally, the Phase 7 core client)
 * share one auth + validation path. Zod-validates every response at the
 * boundary. No React / React Native imports — runs anywhere with `fetch`.
 */
import type { z } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequesterOptions {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null> | string | null;
  fetchFn?: typeof fetch;
}

export type Requester = <T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
) => Promise<T>;

export function createRequester(opts: RequesterOptions): Requester {
  const baseUrl = opts.baseUrl.replace(/\/$/, '');
  const fetchFn = opts.fetchFn ?? fetch;

  return async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    init?: RequestInit,
  ): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (opts.getAccessToken) {
      const token = await opts.getAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetchFn(`${baseUrl}${path}`, { ...init, headers });
    const text = await res.text();
    const json: unknown = text ? JSON.parse(text) : null;

    if (!res.ok) {
      throw new ApiError(res.status, `API ${res.status} for ${path}`, json);
    }
    return schema.parse(json);
  };
}
