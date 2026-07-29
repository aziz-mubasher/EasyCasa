'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';

const CASAFARI_IMPORTER_USERNAMES = new Set(['muba-seller', 'muba-admin']);

function jwtPayload(accessToken: string | null): {
  preferred_username?: unknown;
  email?: unknown;
  realm_access?: { roles?: unknown };
} | null {
  if (!accessToken) return null;
  try {
    const payloadPart = accessToken.split('.')[1];
    if (!payloadPart) return null;
    const json = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as {
      preferred_username?: unknown;
      email?: unknown;
      realm_access?: { roles?: unknown };
    };
  } catch {
    return null;
  }
}

function importerIdentity(payload: NonNullable<ReturnType<typeof jwtPayload>>): string {
  if (typeof payload.preferred_username === 'string' && payload.preferred_username.trim()) {
    return payload.preferred_username.trim().toLowerCase();
  }
  if (typeof payload.email === 'string' && payload.email.includes('@')) {
    return payload.email.split('@')[0]!.trim().toLowerCase();
  }
  return '';
}

function hasAdminRole(payload: NonNullable<ReturnType<typeof jwtPayload>>): boolean {
  const roles = payload.realm_access?.roles;
  return Array.isArray(roles) && roles.map(String).includes('admin');
}

/** True when the signed-in user may use Casafari folder import (admin role or allowlisted). */
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
      const payload = jwtPayload(token);
      if (!payload) {
        setCanImport(false);
        return;
      }
      setCanImport(hasAdminRole(payload) || CASAFARI_IMPORTER_USERNAMES.has(importerIdentity(payload)));
    });
    return () => {
      cancelled = true;
    };
  }, [ready, isAuthenticated, getAccessToken]);

  return { ready, canImport };
}
