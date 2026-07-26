import { Suspense } from 'react';
import { PaymentSuccessClient } from '@/components/pricing/PaymentSuccessClient';

type Props = { params: { locale: string } };

export default function PagamentoSuccessoPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted">…</p>}>
      <PaymentSuccessClient locale={params.locale} />
    </Suspense>
  );
}
