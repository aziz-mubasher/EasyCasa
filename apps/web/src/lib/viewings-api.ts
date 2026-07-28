'use client';

import { useMemo } from 'react';
import { EasyCasaViewingsApi } from '@easycasa/api-client';

import { useAuth } from '@/auth/AuthProvider';
import { apiBaseUrl } from '@/auth/config';

/** Typed Phase 29 viewings client wired to the web OIDC token getter. */
export function useViewingsApi(): EasyCasaViewingsApi {
  const { getAccessToken } = useAuth();
  return useMemo(
    () => new EasyCasaViewingsApi({ baseUrl: apiBaseUrl, getAccessToken }),
    [getAccessToken],
  );
}
