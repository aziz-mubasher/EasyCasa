import { Suspense } from 'react';
import { CheckoutPageClient } from '@/components/pricing/CheckoutPageClient';

type Props = { params: { locale: string } };

export default function PagamentoCheckoutPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted">…</p>}>
      <CheckoutPageClient locale={params.locale} />
    </Suspense>
  );
}
