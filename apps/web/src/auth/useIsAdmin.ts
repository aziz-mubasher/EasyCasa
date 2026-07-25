'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';

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

/** True when the signed-in user has the Keycloak `admin` realm role. */
export function useIsAdmin(): { ready: boolean; isAdmin: boolean } {
  const { ready, getAccessToken, isAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    void getAccessToken().then((token) => {
      if (cancelled) return;
      setIsAdmin(rolesFromJwt(token).includes('admin'));
    });
    return () => {
      cancelled = true;
    };
  }, [ready, isAuthenticated, getAccessToken]);

  return { ready, isAdmin };
}
