import React, { createContext, useContext, useMemo } from 'react';

import { EasyCasaAdminApi } from '@easycasa/api-client';

import { useAuth } from './auth/AuthProvider';

const ApiContext = createContext<EasyCasaAdminApi | null>(null);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://easycasaita.com/api';

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();
  const api = useMemo(
    () =>
      new EasyCasaAdminApi({
        baseUrl: API_BASE_URL,
        getAccessToken,
      }),
    [getAccessToken],
  );
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): EasyCasaAdminApi {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used within ApiProvider');
  return ctx;
}
