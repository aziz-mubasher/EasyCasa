import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  CatalogItem,
  FascicoloEvaluation,
  FascicoloView,
  OwnerProperty,
  Quote,
  QuoteRequest,
  ServicePackage,
} from '@easycasa/api-client';

import { useOwnerApi } from './owner';

const keys = {
  catalog: () => ['owner', 'catalog'] as const,
  packages: () => ['owner', 'packages'] as const,
  properties: () => ['owner', 'properties'] as const,
  fascicolo: (id: string) => ['owner', 'fascicolo', id] as const,
};

export function useCatalog(): UseQueryResult<CatalogItem[]> {
  const api = useOwnerApi();
  return useQuery({ queryKey: keys.catalog(), queryFn: () => api.listCatalog() });
}

export function usePackages(): UseQueryResult<ServicePackage[]> {
  const api = useOwnerApi();
  return useQuery({ queryKey: keys.packages(), queryFn: () => api.listPackages() });
}

export function useMyProperties(): UseQueryResult<OwnerProperty[]> {
  const api = useOwnerApi();
  return useQuery({ queryKey: keys.properties(), queryFn: () => api.listMyProperties() });
}

export function useFascicolo(propertyId: string): UseQueryResult<FascicoloView> {
  const api = useOwnerApi();
  return useQuery({
    queryKey: keys.fascicolo(propertyId),
    queryFn: () => api.getFascicolo(propertyId),
    enabled: propertyId.length > 0,
  });
}

/** Build a quote from the current selection. */
export function useQuote() {
  const api = useOwnerApi();
  return useMutation<Quote, Error, QuoteRequest>({
    mutationFn: (req) => api.createQuote(req),
  });
}

/**
 * Attach a document; the endpoint returns the recomputed gates, and we refresh
 * the fascicolo view so the checklist + gate banner update immediately.
 */
export function useAddDocument(propertyId: string) {
  const api = useOwnerApi();
  const qc = useQueryClient();
  return useMutation<FascicoloEvaluation, Error, { code: string; url: string; issuedAt?: string }>({
    mutationFn: (body) => api.addDocument(propertyId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.fascicolo(propertyId) });
    },
  });
}
