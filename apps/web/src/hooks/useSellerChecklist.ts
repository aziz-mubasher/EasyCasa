'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { parseChecklistResponse, type ChecklistWire } from '@/lib/seller-trust';

type SellerChecklistState = {
  loading: boolean;
  flagOff: boolean;
  data: ChecklistWire | null;
  refresh: () => Promise<void>;
};

/** GET /seller/checklist/:listingId — document checklist for seller listing surface. */
export function useSellerChecklist(listingId: string, enabled = true): SellerChecklistState {
  const { ready, isAuthenticated, getAccessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flagOff, setFlagOff] = useState(false);
  const [data, setData] = useState<ChecklistWire | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !ready || !isAuthenticated || !listingId) {
      setLoading(false);
      setFlagOff(false);
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await createAuthedFetch(getAccessToken)(
        apiUrl(`/seller/checklist/${listingId}`),
      );
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
      setData(parseChecklistResponse(await res.json()));
    } finally {
      setLoading(false);
    }
  }, [enabled, ready, isAuthenticated, getAccessToken, listingId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, flagOff, data, refresh };
}
