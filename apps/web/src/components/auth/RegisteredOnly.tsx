'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/auth/AuthProvider';

/** Renders children only for signed-in users; otherwise `fallback`. */
export function RegisteredOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { ready, isAuthenticated } = useAuth();
  if (!ready) return null;
  if (!isAuthenticated) return <>{fallback}</>;
  return <>{children}</>;
}
