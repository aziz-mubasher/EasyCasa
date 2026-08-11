import type { ReactNode } from 'react';
import { SellerConsentUpdate } from '@/components/seller/SellerConsentUpdate';

/**
 * EC-S-T32 — seller shell mounts T30 consent banner / interstitial once for
 * all `/seller/*` surfaces.
 */
export default function SellerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SellerConsentUpdate />
      {children}
    </>
  );
}
