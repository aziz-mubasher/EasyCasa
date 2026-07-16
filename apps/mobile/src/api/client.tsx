import React, { createContext, useContext, useMemo } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from 'react-native-async-storage';

import { EasyCasaClient } from '@easycasa/api-client';
import { config } from '../config';
import { useAuth } from '../auth/AuthProvider';

const ClientContext = createContext<EasyCasaClient | null>(null);

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ec.query-cache',
});

/**
 * Provides both the typed EasyCasa API client (wired to the current auth
 * token) and a TanStack QueryClient whose cache is persisted, so favorites and
 * recent searches survive an app relaunch and read instantly offline.
 */
export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();

  const client = useMemo(
    () =>
      new EasyCasaClient({
        baseUrl: config.apiBaseUrl,
        getAccessToken,
      }),
    [getAccessToken],
  );

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 1000 * 60 * 60 * 24, // keep 24h for offline reads
            retry: 2,
          },
        },
      }),
    [],
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
    </PersistQueryClientProvider>
  );
}

export function useApi(): EasyCasaClient {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useApi must be used within ApiProvider');
  return ctx;
}
