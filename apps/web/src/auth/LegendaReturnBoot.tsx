'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { useAuth } from './AuthProvider';
import { isAllowedLegendaReturn } from './cookieDomain';

/** If the lab host sent ?legenda_return=, start OIDC and bounce back after login. */
export function LegendaReturnBoot() {
  const params = useSearchParams();
  const { ready, isAuthenticated, signIn } = useAuth();

  useEffect(() => {
    if (!ready || isAuthenticated) return;
    const dest = params.get('legenda_return');
    if (!dest || !isAllowedLegendaReturn(dest)) return;
    void signIn(dest);
  }, [ready, isAuthenticated, params, signIn]);

  return null;
}
