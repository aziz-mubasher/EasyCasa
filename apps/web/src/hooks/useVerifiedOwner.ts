'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { parseVoCase, type VoCaseWire } from '@/lib/seller-trust';

type VerifiedOwnerState = {
  loading: boolean;
  flagOff: boolean;
  data: VoCaseWire | null;
  refresh: () => Promise<void>;
};

/** GET /seller/vo/:listingId — Verified Owner case for seller listing surface. */
export function useVerifiedOwner(listingId: string, enabled = true): VerifiedOwnerState {
  const { ready, isAuthenticated, getAccessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flagOff, setFlagOff] = useState(false);
  const [data, setData] = useState<VoCaseWire | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !ready || !isAuthenticated || !listingId) {
      setLoading(false);
      setFlagOff(false);
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await createAuthedFetch(getAccessToken)(apiUrl(`/seller/vo/${listingId}`));
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
      setFlagOff(false);
      setData(parseVoCase(await res.json()));
    } finally {
      setLoading(false);
    }
  }, [enabled, ready, isAuthenticated, getAccessToken, listingId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, flagOff, data, refresh };
}
