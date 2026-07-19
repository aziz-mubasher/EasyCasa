import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';

import { EasyCasaValuationApi, type EstimateResult, type SubjectProperty } from '@easycasa/api-client';
import { config } from '../config';
import { useAuth } from '../auth/AuthProvider';

function useValuationApi(): EasyCasaValuationApi {
  const { getAccessToken } = useAuth();
  return useMemo(() => new EasyCasaValuationApi({ baseUrl: config.apiBaseUrl, getAccessToken }), [getAccessToken]);
}

export function useValuationEstimate() {
  const api = useValuationApi();
  return useMutation<EstimateResult, Error, { subject: SubjectProperty; contactEmail?: string }>({
    mutationFn: (body) => api.estimate(body),
  });
}
