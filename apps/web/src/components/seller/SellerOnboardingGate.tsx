'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/routing';

import { useAuth } from '@/auth/AuthProvider';
import { useSellerMe } from '@/hooks/useSellerMe';

const ONBOARDING_PATH = '/seller/onboarding';

/**
 * EC-S PP-4 — redirect dark-profile sellers to onboarding from the seller shell.
 * Consent interstitial (T32) still mounts via SellerConsentUpdate once profile exists.
 */
export function SellerOnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, isAuthenticated } = useAuth();
  const { loading, flagOff, profile } = useSellerMe(ready && isAuthenticated);

  useEffect(() => {
    if (!ready || !isAuthenticated || loading || flagOff) return;
    if (profile) return;
    if (pathname === ONBOARDING_PATH || pathname.startsWith(`${ONBOARDING_PATH}/`)) return;
    router.replace(ONBOARDING_PATH);
  }, [ready, isAuthenticated, loading, flagOff, profile, pathname, router]);

  return null;
}
