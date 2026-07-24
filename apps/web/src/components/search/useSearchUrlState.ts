'use client';

import { useCallback } from 'react';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';

/** Sync search filter state to the URL query string. */
export function useSearchUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const get = useCallback((key: string) => params.get(key) ?? '', [params]);

  const setMany = useCallback(
    (
      updates: Record<string, string | null | undefined>,
      resetPage = true,
      /** Override path (e.g. homepage search → `/search`). */
      targetPath?: string,
    ) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value != null && value !== '') next.set(key, value);
        else next.delete(key);
      }
      if (resetPage) next.delete('page');
      const qs = next.toString();
      const path = targetPath ?? pathname;
      router.push(qs ? `${path}?${qs}` : path);
    },
    [params, pathname, router],
  );

  const set = useCallback(
    (key: string, value: string) => setMany({ [key]: value || null }),
    [setMany],
  );

  const clearAll = useCallback(() => router.push(pathname), [pathname, router]);

  const remove = useCallback(
    (key: string) => {
      const next = new URLSearchParams(params.toString());
      next.delete(key);
      next.delete('page');
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [params, pathname, router],
  );

  return { get, set, setMany, clearAll, remove, params };
}
