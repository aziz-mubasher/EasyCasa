import React, { createContext, useContext, useMemo } from 'react';

import { EasyCasaAdminApi } from '@easycasa/api-client';

import { useAuth } from './auth/AuthProvider';

const ApiContext = createContext<EasyCasaAdminApi | null>(null);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://easycasaita.com/api';

function createDevFetch(): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('x-dev-user', 'admin');
    headers.set('x-dev-roles', 'admin');
    headers.set('x-dev-email', 'admin@easycasaita.com');
    return fetch(input, { ...init, headers });
  };
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken, usesDevAuth } = useAuth();
  const api = useMemo(() => {
    const opts: ConstructorParameters<typeof EasyCasaAdminApi>[0] = {
      baseUrl: API_BASE_URL,
      ...(usesDevAuth ? { fetchFn: createDevFetch() } : { getAccessToken }),
    };
    return new EasyCasaAdminApi(opts);
  }, [getAccessToken, usesDevAuth]);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): EasyCasaAdminApi {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used within ApiProvider');
  return ctx;
}
