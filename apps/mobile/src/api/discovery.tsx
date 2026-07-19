import React, { createContext, useContext, useMemo } from 'react';

import {
  EasyCasaListingsApi,
  EasyCasaSavedSearchesApi,
  EasyCasaSearchApi,
} from '@easycasa/api-client';
import { config } from '../config';
import { useAuth } from '../auth/AuthProvider';

interface DiscoveryApis {
  search: EasyCasaSearchApi;
  listings: EasyCasaListingsApi;
  savedSearches: EasyCasaSavedSearchesApi;
}

const DiscoveryCtx = createContext<DiscoveryApis | null>(null);

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();
  const apis = useMemo<DiscoveryApis>(() => {
    const opts = { baseUrl: config.apiBaseUrl, getAccessToken };
    return {
      search: new EasyCasaSearchApi(opts),
      listings: new EasyCasaListingsApi(opts),
      savedSearches: new EasyCasaSavedSearchesApi(opts),
    };
  }, [getAccessToken]);
  return <DiscoveryCtx.Provider value={apis}>{children}</DiscoveryCtx.Provider>;
}

export function useDiscovery(): DiscoveryApis {
  const ctx = useContext(DiscoveryCtx);
  if (!ctx) throw new Error('useDiscovery must be used within DiscoveryProvider');
  return ctx;
}
