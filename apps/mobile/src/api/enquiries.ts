import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import {
  EasyCasaEnquiriesApi,
  type ConvertResult,
  type Enquiry,
  type EnquiryEvent,
  type EnquiryIntent,
} from '@easycasa/api-client';
import { config } from '../config';
import { useAuth } from '../auth/AuthProvider';

function useEnquiriesApi(): EasyCasaEnquiriesApi {
  const { getAccessToken } = useAuth();
  return useMemo(
    () => new EasyCasaEnquiriesApi({ baseUrl: config.apiBaseUrl, getAccessToken }),
    [getAccessToken],
  );
}

/* Seeker side --------------------------------------------------------- */

export interface EnquiryDraft {
  listingId: string;
  intent: EnquiryIntent;
  message: string;
  contactEmail?: string;
  contactPhone?: string;
}

export function useCreateEnquiry() {
  const api = useEnquiriesApi();
  return useMutation<Enquiry, Error, EnquiryDraft>({
    mutationFn: ({ listingId, ...body }) => api.create(listingId, body),
  });
}

/* Owner / mediator inbox ---------------------------------------------- */

const INBOX_KEY = ['enquiries', 'inbound'] as const;

export function useInboundEnquiries(): UseQueryResult<Enquiry[]> {
  const api = useEnquiriesApi();
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: INBOX_KEY,
    queryFn: () => api.listInbound(),
    enabled: isAuthenticated,
  });
}

export function useTransitionEnquiry() {
  const api = useEnquiriesApi();
  const qc = useQueryClient();
  return useMutation<Enquiry, Error, { id: string; event: EnquiryEvent }>({
    mutationFn: ({ id, event }) => api.transition(id, event),
    onSuccess: () => void qc.invalidateQueries({ queryKey: INBOX_KEY }),
  });
}

export function useConvertEnquiry() {
  const api = useEnquiriesApi();
  const qc = useQueryClient();
  return useMutation<ConvertResult, Error, string>({
    mutationFn: (id) => api.convert(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: INBOX_KEY }),
  });
}
