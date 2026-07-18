import { useMutation } from '@tanstack/react-query';
import type { Mandate, Order, SigningUrl } from '@easycasa/api-client';

import { useTransactionsApi } from './transactions';

/** Phase 16 checkout hooks — reuse the existing TransactionsApiProvider. */

export function useCreateOrder(propertyId: string) {
  const api = useTransactionsApi();
  return useMutation<
    Order,
    Error,
    { items?: string[]; packageCode?: string; referenceValueCents?: number }
  >({
    mutationFn: (body) => api.createOrder(propertyId, body),
  });
}

export function useCreateMandate() {
  const api = useTransactionsApi();
  return useMutation<
    Mandate,
    Error,
    { orderId: string; exclusive: boolean; durationMonths: number }
  >({
    mutationFn: (body) => api.createMandate(body),
  });
}

export function useRequestSignature() {
  const api = useTransactionsApi();
  return useMutation<
    SigningUrl,
    Error,
    { mandateId: string; signerEmail: string; documentUrl: string }
  >({
    mutationFn: ({ mandateId, signerEmail, documentUrl }) =>
      api.requestSignature(mandateId, { signerEmail, documentUrl }),
  });
}
