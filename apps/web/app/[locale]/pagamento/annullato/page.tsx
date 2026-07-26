import { PaymentCancelClient } from '@/components/pricing/PaymentCancelClient';

type Props = { params: { locale: string } };

export default function PagamentoAnnullatoPage({ params }: Props) {
  return <PaymentCancelClient locale={params.locale} />;
}
