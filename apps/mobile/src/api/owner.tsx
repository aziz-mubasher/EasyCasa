import React, { createContext, useContext, useMemo } from 'react';

import { EasyCasaOwnerApi } from '@easycasa/api-client';
import { config } from '../config';
import { useAuth } from '../auth/AuthProvider';

const OwnerApiContext = createContext<EasyCasaOwnerApi | null>(null);

/**
 * Provides the Phase 8 owner API (catalog + fascicolo), wired to the same
 * config and auth token as the core client. Mount inside AuthProvider.
 */
export function OwnerApiProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();

  const api = useMemo(
    () => new EasyCasaOwnerApi({ baseUrl: config.apiBaseUrl, getAccessToken }),
    [getAccessToken],
  );

  return <OwnerApiContext.Provider value={api}>{children}</OwnerApiContext.Provider>;
}

export function useOwnerApi(): EasyCasaOwnerApi {
  const ctx = useContext(OwnerApiContext);
  if (!ctx) throw new Error('useOwnerApi must be used within OwnerApiProvider');
  return ctx;
}
