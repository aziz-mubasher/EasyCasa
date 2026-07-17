import React, { createContext, useContext, useMemo } from 'react';

import { EasyCasaTransactionsApi } from '@easycasa/api-client';
import { config } from '../config';
import { useAuth } from '../auth/AuthProvider';

const TxApiContext = createContext<EasyCasaTransactionsApi | null>(null);

/** Phase 10 orders + mandate client. Mount inside AuthProvider. */
export function TransactionsApiProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();

  const api = useMemo(
    () => new EasyCasaTransactionsApi({ baseUrl: config.apiBaseUrl, getAccessToken }),
    [getAccessToken],
  );

  return <TxApiContext.Provider value={api}>{children}</TxApiContext.Provider>;
}

export function useTransactionsApi(): EasyCasaTransactionsApi {
  const ctx = useContext(TxApiContext);
  if (!ctx) throw new Error('useTransactionsApi must be used within TransactionsApiProvider');
  return ctx;
}
