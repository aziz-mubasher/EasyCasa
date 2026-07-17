'use client';

import { useCallback, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://easycasaita.com/api';

type LegalBasis = 'MEDIAZIONE' | 'MANDATO_ONEROSO' | 'REVIEW_REQUIRED';

interface Item {
  code: string;
  labelEn: string;
  labelIt: string;
  category: string;
  legalBasis: LegalBasis;
}

const HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'x-dev-user': 'admin-demo',
  'x-dev-email': 'admin@easycasaita.com',
  'x-dev-roles': 'admin',
};

export default function LegalBasisAdminPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [reviewRequiredCount, setReviewRequiredCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API}/admin/catalog/legal-basis`, { headers: HEADERS });
      if (!res.ok) {
        setError(`Load failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as { items: Item[]; reviewRequiredCount: number };
      setItems(data.items);
      setReviewRequiredCount(data.reviewRequiredCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setBasis(code: string, legalBasis: LegalBasis) {
    setBusy(code);
    setError(null);
    try {
      const res = await fetch(`${API}/admin/catalog/${encodeURIComponent(code)}/legal-basis`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ legalBasis }),
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
        Legal basis
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Classify each catalog item as mediazione or mandato oneroso. Mandates cannot be sent while
        any item is still REVIEW_REQUIRED.
      </p>
      <p className="mt-4 text-sm font-medium">
        Awaiting review: <span className="tabular-nums">{reviewRequiredCount}</span>
      </p>

      {error ? <p className="mt-4 text-sm text-[var(--clay)]">{error}</p> : null}

      <ul className="mt-8 space-y-4">
        {items.map((item) => (
          <li key={item.code} className="border-b border-[var(--line)] pb-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-medium">{item.labelIt}</p>
                <p className="text-xs text-[var(--muted)]">
                  {item.code} · {item.category}
                </p>
              </div>
              <select
                className="rounded border border-[var(--line)] px-2 py-1 text-sm"
                value={item.legalBasis}
                disabled={busy === item.code}
                onChange={(e) => void setBasis(item.code, e.target.value as LegalBasis)}
              >
                <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
                <option value="MEDIAZIONE">MEDIAZIONE</option>
                <option value="MANDATO_ONEROSO">MANDATO_ONEROSO</option>
              </select>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
