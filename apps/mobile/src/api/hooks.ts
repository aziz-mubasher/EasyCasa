import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  Listing,
  ListingDetail,
  PagedListings,
  SavedSearch,
  SearchParams,
} from '@easycasa/api-client';

import { useApi } from './client';
import { useAuth } from '../auth/AuthProvider';

const keys = {
  listings: (p: SearchParams) => ['listings', p] as const,
  listing: (slug: string) => ['listing', slug] as const,
  favorites: () => ['favorites'] as const,
  savedSearches: () => ['saved-searches'] as const,
};

export function useListings(params: SearchParams): UseQueryResult<PagedListings> {
  const api = useApi();
  return useQuery({
    queryKey: keys.listings(params),
    queryFn: () => api.searchListings(params),
  });
}

export function useListing(slug: string): UseQueryResult<ListingDetail> {
  const api = useApi();
  return useQuery({
    queryKey: keys.listing(slug),
    queryFn: () => api.getListing(slug),
    enabled: slug.length > 0,
  });
}

export function useFavorites(): UseQueryResult<Listing[]> {
  const api = useApi();
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: keys.favorites(),
    queryFn: () => api.getFavorites(),
    enabled: isAuthenticated,
  });
}

export function useSavedSearches(): UseQueryResult<SavedSearch[]> {
  const api = useApi();
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: keys.savedSearches(),
    queryFn: () => api.getSavedSearches(),
    enabled: isAuthenticated,
  });
}

/**
 * Optimistic favorite toggle: flips the cache immediately, rolls back on error.
 */
export function useToggleFavorite() {
  const api = useApi();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId, next }: { listingId: string; next: boolean }) =>
      next ? api.addFavorite(listingId) : api.removeFavorite(listingId),
    onMutate: async ({ listingId, next }) => {
      await qc.cancelQueries({ queryKey: keys.favorites() });
      const previous = qc.getQueryData<Listing[]>(keys.favorites());
      if (previous) {
        qc.setQueryData<Listing[]>(
          keys.favorites(),
          next ? previous : previous.filter((l) => l.id !== listingId),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.favorites(), ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.favorites() });
    },
  });
}
