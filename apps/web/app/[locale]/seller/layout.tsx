import type { ReactNode } from 'react';
import { SellerConsentUpdate } from '@/components/seller/SellerConsentUpdate';
import { SellerDashboardNav } from '@/components/seller/SellerDashboardNav';

/**
 * EC-S-T32 — seller shell mounts T30 consent banner / interstitial once for
 * all `/seller/*` surfaces. T20 / K EC 1.45 adds dashboard nav (inbox link flag-gated).
 */
export default function SellerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SellerConsentUpdate />
      <SellerDashboardNav />
      {children}
    </>
  );
}
