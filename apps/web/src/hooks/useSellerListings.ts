'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import {
  parseSellerListingsWithTrust,
  type SellerListingsWithTrustResponse,
} from '@/lib/seller-trust';

type SellerListingsState = {
  loading: boolean;
  unavailable: boolean;
  data: SellerListingsWithTrustResponse | null;
  refresh: () => Promise<void>;
};

/** GET /seller/listings — dashboard cards + monetisation flag matrix. */
export function useSellerListings(enabled = true): SellerListingsState {
  const { ready, isAuthenticated, getAccessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [data, setData] = useState<SellerListingsWithTrustResponse | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !ready || !isAuthenticated) {
      setLoading(false);
      setUnavailable(false);
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await createAuthedFetch(getAccessToken)(apiUrl('/seller/listings'));
      if (res.status === 404) {
        setUnavailable(true);
        setData(null);
        return;
      }
      if (!res.ok) {
        setUnavailable(true);
        setData(null);
        return;
      }
      const parsed = parseSellerListingsWithTrust(await res.json());
      setUnavailable(false);
      setData(parsed);
    } finally {
      setLoading(false);
    }
  }, [enabled, ready, isAuthenticated, getAccessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, unavailable, data, refresh };
}
