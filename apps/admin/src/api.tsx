import React, { createContext, useContext, useMemo } from 'react';

import { EasyCasaAdminApi } from '@easycasa/api-client';

const ApiContext = createContext<EasyCasaAdminApi | null>(null);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://easycasaita.com/api';
const DEV_AUTH = import.meta.env.VITE_DEV_AUTH === 'true';

function createDevFetch(): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('x-dev-user', 'admin');
    headers.set('x-dev-roles', 'admin');
    headers.set('x-dev-email', 'admin@easycasaita.com');
    return fetch(input, { ...init, headers });
  };
}

export function ApiProvider({
  children,
  getAccessToken,
}: {
  children: React.ReactNode;
  getAccessToken?: () => Promise<string | null> | string | null;
}) {
  const api = useMemo(() => {
    const opts: ConstructorParameters<typeof EasyCasaAdminApi>[0] = {
      baseUrl: API_BASE_URL,
      ...(getAccessToken ? { getAccessToken } : {}),
      ...(DEV_AUTH ? { fetchFn: createDevFetch() } : {}),
    };
    return new EasyCasaAdminApi(opts);
  }, [getAccessToken]);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): EasyCasaAdminApi {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used within ApiProvider');
  return ctx;
}
