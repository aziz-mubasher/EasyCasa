import { SellerTrustListingPanel } from '@/components/seller/SellerTrustListingPanel';

type Props = { params: Promise<{ locale: string; id: string }> };

/** PP-6 — document checklist surface for one seller listing (dark until PK-2). */
export default async function SellerListingDocumentsPage({ params }: Props) {
  const { id } = await params;
  return <SellerTrustListingPanel listingId={id} mode="documents" />;
}
