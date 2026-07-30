'use client';

import { RequireSignInLink } from '@/components/AuthControls';
import { useAdminAuthedFetch } from '@/auth/useAdminAuthedFetch';

import { useCallback, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://easycasaita.com/api';

interface Credential {
  type: string;
  status: string;
  reference?: string;
}

interface Professional {
  id: string;
  coverageProvinces: string[];
  credentials: Credential[];
  activeAssignments: number;
  maxConcurrent: number;
}


export default function ProfessionalsAdminPage() {
  const { ready, isAuthenticated, authedFetch } = useAdminAuthedFetch();
  const [items, setItems] = useState<Professional[]>([]);
  const [name, setName] = useState('');
  const [provinces, setProvinces] = useState('MI');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await authedFetch(`${API}/professionals`);
    if (!res.ok) {
      setError(`Load failed (${res.status})`);
      return;
    }
    setItems((await res.json()) as Professional[]);
  }, [authedFetch]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
  }, [load, isAuthenticated]);

  async function create() {
    setError(null);
    const res = await authedFetch(`${API}/professionals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: name || 'Professionista',
        coverageProvinces: provinces
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
      }),
    });
    if (!res.ok) {
      setError(`Create failed (${res.status})`);
      return;
    }
    setName('');
    await load();
  }

  async function verify(id: string, type: string, status: 'VERIFIED' | 'REJECTED') {
    const res = await authedFetch(`${API}/professionals/${id}/credentials/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        status,
        reason: status === 'VERIFIED' ? 'web admin verify' : 'web admin reject',
      }),
    });
    if (!res.ok) {
      setError(`Verify failed (${res.status})`);
      return;
    }
    await load();
  }

  if (ready && !isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-[var(--muted)] mb-4">Accedi con un account admin.</p>
        <RequireSignInLink />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="eyebrow mb-2">admin</p>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
        Professionisti
      </h1>
      <p className="mt-2 text-[var(--muted)]">Anagrafica, copertura e verifica credenziali.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <input
          className="rounded border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Province (MI,MB)"
          value={provinces}
          onChange={(e) => setProvinces(e.target.value)}
        />
        <button
          type="button"
          className="rounded bg-[var(--primary)] px-4 py-2 text-sm text-white"
          onClick={() => void create()}
        >
          Crea
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-[var(--clay)]">{error}</p> : null}

      <ul className="mt-8 space-y-6">
        {items.map((p) => (
          <li key={p.id} className="border-b border-[var(--line)] pb-4">
            <p className="font-medium font-mono text-sm">{p.id.slice(0, 8)}…</p>
            <p className="text-xs text-[var(--muted)]">
              {p.coverageProvinces.join(', ')} · carico {p.activeAssignments}/{p.maxConcurrent}
            </p>
            <ul className="mt-2 space-y-1">
              {p.credentials.map((c) => (
                <li key={c.type} className="flex flex-wrap items-center gap-2 text-sm">
                  <span>
                    {c.type} · {c.status}
                    {c.reference ? ` · ${c.reference}` : ''}
                  </span>
                  {c.status === 'PENDING' ? (
                    <>
                      <button
                        type="button"
                        className="rounded border border-[var(--line)] px-2 py-0.5 text-xs"
                        onClick={() => void verify(p.id, c.type, 'VERIFIED')}
                      >
                        Verifica
                      </button>
                      <button
                        type="button"
                        className="rounded border border-[var(--line)] px-2 py-0.5 text-xs"
                        onClick={() => void verify(p.id, c.type, 'REJECTED')}
                      >
                        Rifiuta
                      </button>
                    </>
                  ) : null}
                </li>
              ))}
              {p.credentials.length === 0 ? (
                <li className="text-xs text-[var(--muted)]">Nessuna credenziale</li>
              ) : null}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
