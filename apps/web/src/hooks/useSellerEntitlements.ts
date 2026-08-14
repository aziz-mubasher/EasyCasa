'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import {
  parseSellerEntitlementsResponse,
  type SellerEntitlementsResponse,
} from '@/lib/seller-monetisation';

type SellerEntitlementsState = {
  loading: boolean;
  flagOff: boolean;
  data: SellerEntitlementsResponse | null;
  refresh: () => Promise<void>;
};

/** GET /seller/entitlements — tier + quota limits for dashboard copy and upsell. */
export function useSellerEntitlements(enabled = true): SellerEntitlementsState {
  const { ready, isAuthenticated, getAccessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flagOff, setFlagOff] = useState(false);
  const [data, setData] = useState<SellerEntitlementsResponse | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !ready || !isAuthenticated) {
      setLoading(false);
      setFlagOff(false);
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await createAuthedFetch(getAccessToken)(apiUrl('/seller/entitlements'));
      if (res.status === 404) {
        setFlagOff(true);
        setData(null);
        return;
      }
      if (!res.ok) {
        setFlagOff(false);
        setData(null);
        return;
      }
      const parsed = parseSellerEntitlementsResponse(await res.json());
      setFlagOff(false);
      setData(parsed);
    } finally {
      setLoading(false);
    }
  }, [enabled, ready, isAuthenticated, getAccessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, flagOff, data, refresh };
}
