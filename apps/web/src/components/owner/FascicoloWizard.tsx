'use client';

import { useCallback, useEffect, useState } from 'react';

type FascicoloView = {
  propertyId: string;
  checklist: Array<{
    code: string;
    labelEn: string;
    labelIt: string;
    present: boolean;
    verified: boolean;
  }>;
  gates: {
    publish: { allowed: boolean; blockers: Array<{ messageIt: string; messageEn: string }> };
    close: { allowed: boolean; blockers: Array<{ messageIt: string; messageEn: string }> };
    registerLease: { allowed: boolean; blockers: Array<{ messageIt: string; messageEn: string }> };
  };
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://easycasaita.com/api';

function authHeaders(): HeadersInit {
  // DEV_AUTH: match Phase 2 headers when OIDC is not yet configured.
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-dev-user': 'owner-demo',
    'x-dev-email': 'owner@easycasaita.com',
    'x-dev-roles': 'seller',
  };
}

function GateBanner({
  title,
  allowed,
  blockers,
}: {
  title: string;
  allowed: boolean;
  blockers: Array<{ messageIt: string }>;
}) {
  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{
        borderColor: allowed ? 'var(--pine)' : 'var(--clay)',
        background: allowed ? 'color-mix(in srgb, var(--pine) 8%, white)' : 'color-mix(in srgb, var(--clay) 8%, white)',
      }}
    >
      <div className="font-medium">
        {title}: {allowed ? 'OK' : 'bloccato'}
      </div>
      {!allowed && blockers.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-sm text-[var(--muted)]">
          {blockers.map((b) => (
            <li key={b.messageIt}>{b.messageIt}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function FascicoloWizard({ propertyId }: { propertyId: string }) {
  const [view, setView] = useState<FascicoloView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('https://example.com/ape.pdf');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`${API}/properties/${propertyId}/fascicolo`, {
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) {
      setError(`Impossibile caricare il fascicolo (${res.status})`);
      return;
    }
    setView((await res.json()) as FascicoloView);
  }, [propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(code: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/properties/${propertyId}/fascicolo/documents`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ code, url, issuedAt: new Date().toISOString() }),
      });
      if (!res.ok) {
        setError(`Upload fallito (${res.status})`);
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (error && !view) {
    return <p className="text-[var(--clay)]">{error}</p>;
  }
  if (!view) {
    return <p className="text-[var(--muted)]">Caricamento fascicolo…</p>;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Stato dei gate</h2>
        <GateBanner
          title="Pubblicazione"
          allowed={view.gates.publish.allowed}
          blockers={view.gates.publish.blockers}
        />
        <GateBanner
          title="Rogito / chiusura"
          allowed={view.gates.close.allowed}
          blockers={view.gates.close.blockers}
        />
        <GateBanner
          title="Registrazione locazione"
          allowed={view.gates.registerLease.allowed}
          blockers={view.gates.registerLease.blockers}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Checklist documentale</h2>
        <label className="block text-sm text-[var(--muted)]">
          URL documento (demo)
          <input
            className="mt-1 w-full rounded border border-[var(--line)] bg-white px-3 py-2 text-[var(--ink)]"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-[var(--clay)]">{error}</p> : null}
        <ul className="divide-y divide-[var(--line)] border border-[var(--line)] rounded-lg overflow-hidden">
          {view.checklist.map((row) => (
            <li key={row.code} className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3">
              <div>
                <div className="font-medium">{row.labelIt}</div>
                <div className="eyebrow mt-1">
                  {row.present ? (row.verified ? 'presente · verificato' : 'presente · non verificato') : 'mancante'}
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void upload(row.code)}
                className="rounded bg-[var(--azure)] px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {row.present ? 'Aggiorna' : 'Carica'}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-sm text-[var(--muted)]">
          I documenti soddisfano i gate solo dopo verifica ops/admin (`POST …/documents/:code/verify`).
        </p>
      </section>
    </div>
  );
}
