import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { EasyCasaViewingsApi, type Slot, type Viewing, type ViewingAction } from '@easycasa/api-client';
import { config } from '../config';
import { useAuth } from '../auth/AuthProvider';

function useViewingsApi(): EasyCasaViewingsApi {
  const { getAccessToken } = useAuth();
  return useMemo(() => new EasyCasaViewingsApi({ baseUrl: config.apiBaseUrl, getAccessToken }), [getAccessToken]);
}

export function useSlots(listingId: string, fromMs: number, toMs: number): UseQueryResult<Slot[]> {
  const api = useViewingsApi();
  return useQuery({
    queryKey: ['slots', listingId, fromMs, toMs],
    queryFn: () => api.slots(listingId, fromMs, toMs),
  });
}

export function useBookViewing(listingId: string) {
  const api = useViewingsApi();
  const qc = useQueryClient();
  return useMutation<Viewing, Error, { startMs: number; enquiryId?: string }>({
    mutationFn: (body) => api.book(listingId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['slots', listingId] });
      void qc.invalidateQueries({ queryKey: ['my-viewings'] });
    },
  });
}

export function useMyViewings(): UseQueryResult<Viewing[]> {
  const api = useViewingsApi();
  return useQuery({ queryKey: ['my-viewings'], queryFn: () => api.listMine() });
}

export function useViewingAction() {
  const api = useViewingsApi();
  const qc = useQueryClient();
  return useMutation<Viewing, Error, { id: string; action: ViewingAction }>({
    mutationFn: ({ id, action }) => api.act(id, action),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-viewings'] }),
  });
}
