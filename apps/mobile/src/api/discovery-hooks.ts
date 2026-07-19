import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  AlertFrequency,
  AlertSavedSearch,
  AlertSavedSearchCriteria,
  ListingPageDetail,
  MapGeoPoint,
  MapSearchResult,
  SearchFilters,
  SimilarPin,
} from '@easycasa/api-client';

import { useAuth } from '../auth/AuthProvider';
import { useDiscovery } from './discovery';

export interface Bounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export function useBoundsSearch(
  req: { bounds: Bounds; zoom: number; filters: SearchFilters } | null,
): UseQueryResult<MapSearchResult> {
  const { search } = useDiscovery();
  return useQuery({
    queryKey: ['search', 'bounds', req],
    queryFn: () => {
      if (!req) throw new Error('bounds search requires a request');
      return search.searchByBounds({
        ...req.bounds,
        zoom: req.zoom,
        filters: req.filters,
      });
    },
    enabled: req !== null,
    placeholderData: (prev) => prev,
  });
}

export function useAreaSearch(
  req: { polygon: MapGeoPoint[]; zoom: number; filters: SearchFilters } | null,
): UseQueryResult<MapSearchResult> {
  const { search } = useDiscovery();
  return useQuery({
    queryKey: ['search', 'area', req],
    queryFn: () => {
      if (!req) throw new Error('area search requires a request');
      return search.searchByArea(req);
    },
    enabled: req !== null,
  });
}

/** Phase 21 assembled listing detail (UUID or slug). */
export function useDiscoveryListing(id: string | null): UseQueryResult<ListingPageDetail> {
  const { listings } = useDiscovery();
  return useQuery({
    queryKey: ['discovery-listing', id],
    queryFn: () => listings.getListing(id as string),
    enabled: id !== null && id.length > 0,
  });
}

export function useSimilar(id: string | null): UseQueryResult<SimilarPin[]> {
  const { listings } = useDiscovery();
  return useQuery({
    queryKey: ['discovery-listing', id, 'similar'],
    queryFn: () => listings.getSimilar(id as string),
    enabled: id !== null && id.length > 0,
  });
}

export function useDiscoverySavedSearches(): UseQueryResult<AlertSavedSearch[]> {
  const { savedSearches } = useDiscovery();
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['discovery-saved-searches'],
    queryFn: () => savedSearches.list(),
    enabled: isAuthenticated,
  });
}

export function useCreateSavedSearch() {
  const { savedSearches } = useDiscovery();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      criteria: AlertSavedSearchCriteria;
      frequency: AlertFrequency;
    }) => savedSearches.create(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['discovery-saved-searches'] }),
  });
}

export function useSetSavedSearchFrequency() {
  const { savedSearches } = useDiscovery();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; frequency: AlertFrequency }) =>
      savedSearches.setFrequency(v.id, v.frequency),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['discovery-saved-searches'] }),
  });
}

export function useRemoveSavedSearch() {
  const { savedSearches } = useDiscovery();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => savedSearches.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['discovery-saved-searches'] }),
  });
}
