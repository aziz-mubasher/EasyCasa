import type { ReactNode } from 'react';
import { SellerConsentUpdate } from '@/components/seller/SellerConsentUpdate';
import { SellerDashboardNav } from '@/components/seller/SellerDashboardNav';
import { SellerOnboardingGate } from '@/components/seller/SellerOnboardingGate';

/**
 * EC-S-T32 — seller shell mounts T30 consent banner / interstitial once for
 * all `/seller/*` surfaces. T20 / K EC 1.45 adds dashboard nav (inbox link flag-gated).
 * PP-4 — SellerOnboardingGate routes dark-profile users to /seller/onboarding.
 */
export default function SellerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SellerConsentUpdate />
      <SellerOnboardingGate />
      <SellerDashboardNav />
      {children}
    </>
  );
}
