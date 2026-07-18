import React, { createContext, useContext, useMemo } from 'react';

import { EasyCasaRentalsApi } from '@easycasa/api-client';
import { config } from '../config';
import { useAuth } from '../auth/AuthProvider';

const RentalsApiContext = createContext<EasyCasaRentalsApi | null>(null);

/** Phase 12 leases + AML client. Mount inside AuthProvider. */
export function RentalsApiProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();

  const api = useMemo(
    () => new EasyCasaRentalsApi({ baseUrl: config.apiBaseUrl, getAccessToken }),
    [getAccessToken],
  );

  return <RentalsApiContext.Provider value={api}>{children}</RentalsApiContext.Provider>;
}

export function useRentalsApi(): EasyCasaRentalsApi {
  const ctx = useContext(RentalsApiContext);
  if (!ctx) throw new Error('useRentalsApi must be used within RentalsApiProvider');
  return ctx;
}
