'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';

const CASAFARI_IMPORTER_USERNAMES = new Set(['muba-admin']);

function preferredUsernameFromJwt(accessToken: string | null): string | null {
  if (!accessToken) return null;
  try {
    const payloadPart = accessToken.split('.')[1];
    if (!payloadPart) return null;
    const json = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { preferred_username?: unknown };
    return typeof payload.preferred_username === 'string'
      ? payload.preferred_username
      : null;
  } catch {
    return null;
  }
}

/** True only for Keycloak user `muba-admin` (Casafari import privilege). */
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
      const uname = preferredUsernameFromJwt(token)?.trim().toLowerCase() ?? '';
      setCanImport(CASAFARI_IMPORTER_USERNAMES.has(uname));
    });
    return () => {
      cancelled = true;
    };
  }, [ready, isAuthenticated, getAccessToken]);

  return { ready, canImport };
}
