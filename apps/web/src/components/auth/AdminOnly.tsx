'use client';

import type { ReactNode } from 'react';
import { useIsAdmin } from '@/auth/useIsAdmin';

/** Renders children only for Keycloak `admin` users. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { ready, isAdmin } = useIsAdmin();
  if (!ready || !isAdmin) return null;
  return <>{children}</>;
}
