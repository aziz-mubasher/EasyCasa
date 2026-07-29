'use client';

import { useCallback, useMemo } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { createAuthedFetch } from '@/auth/authedFetch';

/** Browser admin prototypes under apps/web — Bearer only (no x-dev-* headers). */
export function useAdminAuthedFetch() {
  const { ready, isAuthenticated, getAccessToken, signIn } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const requireAuth = useCallback(async () => {
    if (!isAuthenticated) await signIn(window.location.pathname);
  }, [isAuthenticated, signIn]);
  return { ready, isAuthenticated, authedFetch, requireAuth, signIn };
}
