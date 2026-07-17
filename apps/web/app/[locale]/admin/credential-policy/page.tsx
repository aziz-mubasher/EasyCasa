'use client';

import { useCallback, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://easycasaita.com/api';

type RequiredCredential =
  | 'NONE'
  | 'REA_MEDIATORE'
  | 'ALBO_TECNICO'
  | 'APE_CERTIFIER'
  | 'PHOTOGRAPHER'
  | 'NOTAIO';

interface PolicyRow {
  itemCode: string;
  requiredCredential: RequiredCredential;
}

const HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'x-dev-user': 'admin-demo',
  'x-dev-email': 'admin@easycasaita.com',
  'x-dev-roles': 'admin',
};

const OPTIONS: RequiredCredential[] = [
  'NONE',
  'REA_MEDIATORE',
  'ALBO_TECNICO',
  'APE_CERTIFIER',
  'PHOTOGRAPHER',
  'NOTAIO',
];

export default function CredentialPolicyAdminPage() {
  const [items, setItems] = useState<PolicyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`${API}/admin/credential-policy`, { headers: HEADERS });
    if (!res.ok) {
      setError(`Load failed (${res.status})`);
      return;
    }
    setItems((await res.json()) as PolicyRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setPolicy(itemCode: string, requiredCredential: RequiredCredential) {
    setBusy(itemCode);
    setError(null);
    try {
      const res = await fetch(`${API}/admin/credential-policy/${encodeURIComponent(itemCode)}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ requiredCredential }),
      });
      if (!res.ok) {
        setError(`Update failed (${res.status})`);
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="eyebrow mb-2">admin</p>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
        Credential policy
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Quale abilitazione richiede ogni voce di catalogo. NONE = non regolamentato.
      </p>
      {error ? <p className="mt-4 text-sm text-[var(--clay)]">{error}</p> : null}
      <ul className="mt-8 space-y-4">
        {items.map((item) => (
          <li key={item.itemCode} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
            <span className="font-mono text-sm">{item.itemCode}</span>
            <select
              className="rounded border border-[var(--line)] px-2 py-1 text-sm"
              value={item.requiredCredential}
              disabled={busy === item.itemCode}
              onChange={(e) => void setPolicy(item.itemCode, e.target.value as RequiredCredential)}
            >
              {OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
