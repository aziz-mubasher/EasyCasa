'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import type { SellerMeResponse } from '@/lib/seller-onboarding';

type SellerMeState = {
  loading: boolean;
  flagOff: boolean;
  profile: SellerMeResponse['profile'];
  consent: SellerMeResponse['consent'] | null;
  refresh: () => Promise<void>;
};

/** GET /seller/me — profile + consent for onboarding gate and T32 shell. */
export function useSellerMe(enabled = true): SellerMeState {
  const { ready, isAuthenticated, getAccessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flagOff, setFlagOff] = useState(false);
  const [profile, setProfile] = useState<SellerMeResponse['profile']>(null);
  const [consent, setConsent] = useState<SellerMeResponse['consent'] | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !ready || !isAuthenticated) {
      setLoading(false);
      setFlagOff(false);
      setProfile(null);
      setConsent(null);
      return;
    }
    setLoading(true);
    try {
      const fetchAuth = createAuthedFetch(getAccessToken);
      const res = await fetchAuth(apiUrl('/seller/me'));
      if (res.status === 404) {
        setFlagOff(true);
        setProfile(null);
        setConsent(null);
        return;
      }
      if (!res.ok) {
        setFlagOff(false);
        setProfile(null);
        setConsent(null);
        return;
      }
      const body = (await res.json()) as SellerMeResponse;
      setFlagOff(false);
      setProfile(body.profile);
      setConsent(body.consent);
    } finally {
      setLoading(false);
    }
  }, [enabled, ready, isAuthenticated, getAccessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, flagOff, profile, consent, refresh };
}
