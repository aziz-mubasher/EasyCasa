'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';

const CASAFARI_IMPORTER_USERNAMES = new Set(['muba-seller', 'muba-admin']);

function importerIdentityFromJwt(accessToken: string | null): string | null {
  if (!accessToken) return null;
  try {
    const payloadPart = accessToken.split('.')[1];
    if (!payloadPart) return null;
    const json = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as {
      preferred_username?: unknown;
      email?: unknown;
    };
    if (typeof payload.preferred_username === 'string' && payload.preferred_username.trim()) {
      return payload.preferred_username.trim().toLowerCase();
    }
    if (typeof payload.email === 'string' && payload.email.includes('@')) {
      return payload.email.split('@')[0]!.trim().toLowerCase();
    }
    return null;
  } catch {
    return null;
  }
}

/** True for Keycloak users `muba-seller` or `muba-admin` (Casafari folder import). */
export function useCanImportCasafari(): { ready: boolean; canImport: boolean } {
  const { ready, getAccessToken, isAuthenticated } = useAuth();
  const [canImport, setCanImport] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      setCanImport(false);
      return;
    }
    let cancelled = false;
    void getAccessToken().then((token) => {
      if (cancelled) return;
      const uname = importerIdentityFromJwt(token) ?? '';
      setCanImport(CASAFARI_IMPORTER_USERNAMES.has(uname));
    });
    return () => {
      cancelled = true;
    };
  }, [ready, isAuthenticated, getAccessToken]);

  return { ready, canImport };
}
