import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';

import { EasyCasaEnquiriesApi, type Enquiry, type EnquiryIntent } from '@easycasa/api-client';
import { config } from '../config';
import { useAuth } from '../auth/AuthProvider';

function useEnquiriesApi(): EasyCasaEnquiriesApi {
  const { getAccessToken } = useAuth();
  return useMemo(
    () => new EasyCasaEnquiriesApi({ baseUrl: config.apiBaseUrl, getAccessToken }),
    [getAccessToken],
  );
}

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
