'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { createAuthedFetch } from '@/auth/authedFetch';
import { addFavorite, fetchFavorites, removeFavorite } from '@/lib/me-api';

const PENDING_FAVORITE_KEY = 'easycasa_pending_favorite';

type FavoritesContextValue = {
  ready: boolean;
  favoriteIds: Set<string>;
  isFavorite: (listingId: string) => boolean;
  toggleFavorite: (listingId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { ready: authReady, isAuthenticated, getAccessToken, signIn } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!authReady || !isAuthenticated) {
      setFavoriteIds(new Set());
      setLoaded(true);
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      setFavoriteIds(new Set());
      setLoaded(true);
      return;
    }
    try {
      const rows = await fetchFavorites(authedFetch, token);
      setFavoriteIds(new Set(rows.map((r) => r.id)));
    } catch {
      // Non-blocking — cards stay unsaved until a successful fetch.
    } finally {
      setLoaded(true);
    }
  }, [authReady, isAuthenticated, getAccessToken, authedFetch]);

  useEffect(() => {
    setLoaded(false);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!authReady || !isAuthenticated || !loaded) return;
    const pending = sessionStorage.getItem(PENDING_FAVORITE_KEY);
    if (!pending) return;
    sessionStorage.removeItem(PENDING_FAVORITE_KEY);
    void (async () => {
      const token = await getAccessToken();
      if (!token) return;
      try {
        await addFavorite(authedFetch, token, pending);
        setFavoriteIds((prev) => new Set(prev).add(pending));
      } catch {
        /* ignore */
      }
    })();
  }, [authReady, isAuthenticated, loaded, getAccessToken, authedFetch]);

  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (!authReady) return;
      if (!isAuthenticated) {
        sessionStorage.setItem(PENDING_FAVORITE_KEY, listingId);
        const returnTo =
          typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
        await signIn(returnTo);
        return;
      }
      const token = await getAccessToken();
      if (!token) return;

      const wasSaved = favoriteIds.has(listingId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(listingId);
        else next.add(listingId);
        return next;
      });

      try {
        if (wasSaved) await removeFavorite(authedFetch, token, listingId);
        else await addFavorite(authedFetch, token, listingId);
      } catch {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
      }
    },
    [authReady, isAuthenticated, getAccessToken, authedFetch, favoriteIds, signIn],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      ready: authReady && loaded,
      favoriteIds,
      isFavorite: (id) => favoriteIds.has(id),
      toggleFavorite,
      refresh,
    }),
    [authReady, loaded, favoriteIds, toggleFavorite, refresh],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}

export { PENDING_FAVORITE_KEY };
