import React, { createContext, useContext, useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  EasyCasaPaymentsApi,
  type CreatedIntent,
  type Fattura,
  type PaymentIntent,
} from '@easycasa/api-client';

import { config } from '../config';
import { useAuth } from '../auth/AuthProvider';

const BillingCtx = createContext<EasyCasaPaymentsApi | null>(null);

/** Phase 18 payments + invoice preview. Mount inside AuthProvider. */
export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();
  const api = useMemo(
    () => new EasyCasaPaymentsApi({ baseUrl: config.apiBaseUrl, getAccessToken }),
    [getAccessToken],
  );
  return <BillingCtx.Provider value={api}>{children}</BillingCtx.Provider>;
}

function useBillingApi(): EasyCasaPaymentsApi {
  const ctx = useContext(BillingCtx);
  if (!ctx) throw new Error('useBillingApi must be used within BillingProvider');
  return ctx;
}

/** Fattura preview for an order (totals shown before paying). */
export function useInvoicePreview(orderId: string | null): UseQueryResult<Fattura> {
  const api = useBillingApi();
  return useQuery({
    queryKey: ['invoice-preview', orderId],
    queryFn: () => api.previewInvoice(orderId as string),
    enabled: orderId !== null,
  });
}

export function useCreateIntent() {
  const api = useBillingApi();
  return useMutation<
    CreatedIntent,
    Error,
    { orderId: string; purpose: 'DUE_NOW' | 'PROVVIGIONE'; amountCents: number }
  >({
    mutationFn: (body) => api.createIntent(body),
  });
}

/** Poll the intent to reflect the webhook-driven final status. */
export function usePaymentIntent(intentId: string | null): UseQueryResult<PaymentIntent> {
  const api = useBillingApi();
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['payment-intent', intentId],
    queryFn: async () => {
      const intent = await api.getIntent(intentId as string);
      if (intent.status === 'SUCCEEDED') void qc.invalidateQueries({ queryKey: ['owner'] });
      return intent;
    },
    enabled: intentId !== null,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'SUCCEEDED' || s === 'FAILED' || s === 'REFUNDED' ? false : 2000;
    },
  });
}
