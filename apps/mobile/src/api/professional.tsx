import React, { createContext, useContext, useMemo } from 'react';

import { EasyCasaProfessionalApi } from '@easycasa/api-client';
import { config } from '../config';
import { useAuth } from '../auth/AuthProvider';

const ProApiContext = createContext<EasyCasaProfessionalApi | null>(null);

export function ProApiProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();
  const api = useMemo(
    () => new EasyCasaProfessionalApi({ baseUrl: config.apiBaseUrl, getAccessToken }),
    [getAccessToken],
  );
  return <ProApiContext.Provider value={api}>{children}</ProApiContext.Provider>;
}

export function useProApi(): EasyCasaProfessionalApi {
  const ctx = useContext(ProApiContext);
  if (!ctx) throw new Error('useProApi must be used within ProApiProvider');
  return ctx;
}
