'use client';

import { Suspense, type ReactNode } from 'react';

import { AuthProvider } from '@/auth/AuthProvider';
import { LegendaReturnBoot } from '@/auth/LegendaReturnBoot';
import { FavoritesProvider } from '@/favorites/FavoritesProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <LegendaReturnBoot />
      </Suspense>
      <FavoritesProvider>{children}</FavoritesProvider>
    </AuthProvider>
  );
}
