'use client';

import { useAuth } from '@/auth/AuthProvider';
import { useEffect, useState } from 'react';

function rolesFromJwt(accessToken: string | null): string[] {
  if (!accessToken) return [];
  try {
    const payloadPart = accessToken.split('.')[1];
    if (!payloadPart) return [];
    const json = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { realm_access?: { roles?: unknown } };
    const roles = payload.realm_access?.roles;
    return Array.isArray(roles) ? roles.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * PR-W — private sellers (seller without agent/partner/pro_marketer) use the
 * T07 wizard; agency users keep the legacy /add form.
 */
export function useListingPublishRoute(): {
  ready: boolean;
  /** Prefer T07 wizard over legacy /add. */
  useSellerWizard: boolean;
} {
  const { ready, getAccessToken, isAuthenticated } = useAuth();
  const [useSellerWizard, setUseSellerWizard] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      setUseSellerWizard(false);
      return;
    }
    let cancelled = false;
    void getAccessToken().then((token) => {
      if (cancelled) return;
      const roles = rolesFromJwt(token);
      const isAgency =
        roles.includes('agent') ||
        roles.includes('partner') ||
        roles.includes('pro_marketer') ||
        roles.includes('admin');
      const isSeller = roles.includes('seller');
      setUseSellerWizard(isSeller && !isAgency);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, isAuthenticated, getAccessToken]);

  return { ready, useSellerWizard };
}
