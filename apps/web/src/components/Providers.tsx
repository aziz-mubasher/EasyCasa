'use client';

import type { ReactNode } from 'react';

import { AuthProvider } from '@/auth/AuthProvider';
import { FavoritesProvider } from '@/favorites/FavoritesProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FavoritesProvider>{children}</FavoritesProvider>
    </AuthProvider>
  );
}
