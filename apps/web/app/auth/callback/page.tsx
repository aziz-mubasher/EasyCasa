'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { completeOAuthCallback } from '@/auth/AuthProvider';

function CallbackInner() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const returnTo = await completeOAuthCallback(params);
        window.location.replace(returnTo);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Accesso non riuscito');
      }
    })();
  }, [params]);

  if (error) {
    return (
      <>
        <h1 className="font-display text-xl font-semibold">Accesso non riuscito</h1>
        <p className="mt-3 text-sm text-muted">{error}</p>
        <a className="mt-6 inline-block underline" href="/">
          Torna alla home
        </a>
      </>
    );
  }

  return <p>Accesso in corso…</p>;
}

export default function AuthCallbackPage() {
  return (
    <main className="mx-auto max-w-md px-5 py-16 text-center text-sm text-muted">
      <Suspense fallback={<p>Accesso in corso…</p>}>
        <CallbackInner />
      </Suspense>
    </main>
  );
}
