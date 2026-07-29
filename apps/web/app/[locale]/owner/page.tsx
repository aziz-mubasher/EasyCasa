'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/auth/AuthProvider';
import { createAuthedFetch } from '@/auth/authedFetch';
import { RequireSignInLink } from '@/components/AuthControls';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://easycasaita.com/api';

export default function OwnerPropertiesPage() {
  const router = useRouter();
  const { ready, isAuthenticated, getAccessToken, signIn } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const [title, setTitle] = useState('');
  const [dealType, setDealType] = useState<'sale' | 'rent'>('sale');
  const [inCondominio, setInCondominio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!isAuthenticated) {
      await signIn(window.location.pathname);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch(`${API}/properties`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: title || 'Nuovo immobile', dealType, inCondominio }),
      });
      if (!res.ok) {
        setError(`Creazione fallita (${res.status})`);
        return;
      }
      const p = (await res.json()) as { id: string };
      const locale = window.location.pathname.split('/')[1] || 'it';
      router.push(`/${locale}/owner/properties/${p.id}/fascicolo`);
    } finally {
      setBusy(false);
    }
  }

  if (ready && !isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl px-5 py-10">
        <p className="eyebrow mb-2">proprietario</p>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Onboard immobile
        </h1>
        <p className="mt-4 text-[var(--muted)] mb-4">Accedi per creare una Property e aprire il fascicolo.</p>
        <RequireSignInLink />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <p className="eyebrow mb-2">proprietario</p>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
        Onboard immobile
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Crea una Property privata e apri il fascicolo documentale.
      </p>

      <div className="mt-8 space-y-4">
        <label className="block text-sm">
          Titolo
          <input
            className="mt-1 w-full rounded border border-[var(--line)] px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Appartamento in centro"
          />
        </label>
        <label className="block text-sm">
          Tipo
          <select
            className="mt-1 w-full rounded border border-[var(--line)] px-3 py-2"
            value={dealType}
            onChange={(e) => setDealType(e.target.value as 'sale' | 'rent')}
          >
            <option value="sale">Vendita</option>
            <option value="rent">Affitto</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={inCondominio}
            onChange={(e) => setInCondominio(e.target.checked)}
          />
          In condominio
        </label>
        {error ? <p className="text-sm text-[var(--clay)]">{error}</p> : null}
        <button
          type="button"
          disabled={busy || !ready}
          onClick={() => void create()}
          className="rounded bg-[var(--azure)] px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? 'Creazione…' : 'Crea Property'}
        </button>
      </div>
    </div>
  );
}
