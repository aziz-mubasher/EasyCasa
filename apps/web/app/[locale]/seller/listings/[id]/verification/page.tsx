import { SellerTrustListingPanel } from '@/components/seller/SellerTrustListingPanel';

type Props = { params: Promise<{ locale: string; id: string }> };

/** PP-6 — Verified Owner surface for one seller listing (dark until PK-1). */
export default async function SellerListingVerificationPage({ params }: Props) {
  const { id } = await params;
  return <SellerTrustListingPanel listingId={id} mode="verification" />;
}
