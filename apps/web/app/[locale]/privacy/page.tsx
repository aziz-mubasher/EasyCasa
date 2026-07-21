'use client';

import { useMemo, useState } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { SignInPrompt } from '@/components/AuthControls';
import { Button } from '@/components/ui/Button';

/**
 * Seeker privacy area — Phase 38. Export (Art. 15) and erase (Art. 17).
 * Requires OIDC PKCE sign-in (Authorization: Bearer).
 */
export default function PrivacyPage() {
  const { getAccessToken, isAuthenticated, ready } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [eraseReport, setEraseReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function downloadExport() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch(apiUrl('/me/privacy/export'));
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
      const res = await authedFetch(apiUrl('/me/privacy/erase'), { method: 'POST' });
      if (!res.ok) throw new Error(`Cancellazione fallita (${res.status})`);
      const data = await res.json();
      setEraseReport(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setBusy(false);
    }
  }

  if (ready && !isAuthenticated) {
    return (
      <section className="mx-auto max-w-2xl px-5 py-12 space-y-8">
        <div>
          <p className="eyebrow mb-2">Privacy</p>
          <h1 className="font-display text-3xl font-semibold">I tuoi dati</h1>
          <SignInPrompt message="Accedi per scaricare o cancellare i tuoi dati." />
        </div>
      </section>
    );
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
