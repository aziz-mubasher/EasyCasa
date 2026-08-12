import { SellerInboxPanel } from '@/components/seller/SellerInboxPanel';

/** EC-S-T20 — seller enquiry inbox (SELLER_INBOX_ENABLED; 404 when off). */
export default function SellerInboxPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <SellerInboxPanel />
    </section>
  );
}
