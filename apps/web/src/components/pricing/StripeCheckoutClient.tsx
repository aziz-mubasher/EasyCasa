'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/auth/AuthProvider';
import { SignInPrompt } from '@/components/AuthControls';
import { stripePublishableKey } from '@/lib/payments-config';
import { formatEuroCents } from '@/lib/pricing-display';

type Props = {
  locale: string;
  clientSecret: string;
  orderId: string;
  amountCents: number;
};

function PayForm({ locale, orderId, amountCents }: Omit<Props, 'clientSecret'>) {
  const t = useTranslations('pricing.checkout');
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPay = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const returnUrl = `${window.location.origin}/${locale}/pagamento/successo?orderId=${encodeURIComponent(orderId)}`;
    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });
    if (submitError) {
      setError(submitError.message ?? t('failed'));
      setBusy(false);
      return;
    }
    router.push(`/${locale}/pagamento/successo?orderId=${encodeURIComponent(orderId)}`);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        {t('total')}: <span className="data font-semibold text-ink">{formatEuroCents(amountCents, locale)}</span>
      </p>
      <PaymentElement />
      {error ? (
        <p className="text-sm text-clay" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={!stripe || busy}
        onClick={() => void onPay()}
        className="inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium font-[var(--font-display)] bg-azure text-paper hover:brightness-110 disabled:opacity-60"
      >
        {busy ? t('busy') : t('pay')}
      </button>
    </div>
  );
}

export function StripeCheckoutClient(props: Props) {
  const pk = stripePublishableKey();
  const stripePromise = useMemo(() => (pk ? loadStripe(pk) : null), [pk]);
  const t = useTranslations('pricing.checkout');
  const { ready, isAuthenticated } = useAuth();

  if (!ready) return null;
  if (!isAuthenticated) {
    return <SignInPrompt message={t('signInRequired')} />;
  }
  if (!stripePromise) {
    return <p className="text-sm text-clay">{t('stripeMissing')}</p>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: props.clientSecret }}>
      <PayForm locale={props.locale} orderId={props.orderId} amountCents={props.amountCents} />
    </Elements>
  );
}

export function StripeCheckoutLoader({
  locale,
  orderId,
  amountCents,
  authedFetch,
}: {
  locale: string;
  orderId: string;
  amountCents: number;
  authedFetch: typeof fetch;
}) {
  const t = useTranslations('pricing.checkout');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { createPaymentIntent } = await import('@/lib/payments-api');
        const intent = await createPaymentIntent(authedFetch, { orderId, amountCents });
        if (!cancelled) setClientSecret(intent.clientSecret);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('failed'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, orderId, amountCents, t]);

  if (error) {
    return (
      <p className="text-sm text-clay" role="alert">
        {error}
      </p>
    );
  }
  if (!clientSecret) {
    return <p className="text-sm text-muted">{t('busy')}</p>;
  }
  return (
    <StripeCheckoutClient
      locale={locale}
      clientSecret={clientSecret}
      orderId={orderId}
      amountCents={amountCents}
    />
  );
}
