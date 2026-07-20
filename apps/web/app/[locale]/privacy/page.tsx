'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api';

function authHeaders(): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-dev-user': 'seeker-privacy',
    'x-dev-email': 'seeker-privacy@easycasaita.com',
    'x-dev-roles': 'buyer',
  };
}

/**
 * Seeker privacy area — Phase 38. Export (Art. 15) and erase (Art. 17).
 */
export default function PrivacyPage() {
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [eraseReport, setEraseReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function downloadExport() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/me/privacy/export`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Export fallito (${res.status})`);
      const data = await res.json();
      setExportJson(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setBusy(false);
    }
  }

  async function requestErase() {
    if (!window.confirm('Confermi la richiesta di cancellazione dei tuoi dati?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/me/privacy/erase`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`Cancellazione fallita (${res.status})`);
      const data = await res.json();
      setEraseReport(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-5 py-12 space-y-8">
      <div>
        <p className="eyebrow mb-2">Privacy</p>
        <h1 className="font-display text-3xl font-semibold">I tuoi dati</h1>
        <p className="mt-3 text-muted text-sm max-w-xl">
          Scarica una copia dei dati che trattiamo su di te, oppure richiedi la
          cancellazione. Alcuni dati legati a una transazione conclusa possono
          essere conservati per obbligo di legge — il report lo indica.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={busy} onClick={() => void downloadExport()}>
          Scarica i miei dati
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void requestErase()}>
          Cancella il mio account
        </Button>
      </div>

      {error ? <p className="text-sm text-muted">{error}</p> : null}

      {exportJson ? (
        <pre className="text-xs overflow-auto max-h-96 border border-line p-4 rounded-lg bg-paper">
          {exportJson}
        </pre>
      ) : null}

      {eraseReport ? (
        <pre className="text-xs overflow-auto max-h-96 border border-line p-4 rounded-lg bg-paper">
          {eraseReport}
        </pre>
      ) : null}
    </section>
  );
}
