'use client';

import { useCallback, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://easycasaita.com/api';

type AssignmentStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'APPROVED';

interface Assignment {
  id: string;
  taskId: string;
  professionalId: string | null;
  status: AssignmentStatus;
  deliverableUrl: string | null;
}

interface Candidate {
  professional: { id: string; activeAssignments: number; maxConcurrent: number };
  load: number;
}

interface Blocker {
  code: string;
  messageIt: string;
}

const HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'x-dev-user': 'admin-demo',
  'x-dev-email': 'admin@easycasaita.com',
  'x-dev-roles': 'admin',
};

export default function AssignmentsAdminPage() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<Blocker[]>([]);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`${API}/assignments`, { headers: HEADERS });
    if (!res.ok) {
      setError(`Load failed (${res.status})`);
      return;
    }
    const all = (await res.json()) as Assignment[];
    setItems(all.filter((a) => a.status !== 'APPROVED'));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadCandidates(id: string) {
    setSelected(id);
    setBlockers([]);
    setError(null);
    const res = await fetch(`${API}/assignments/${id}/candidates`, { headers: HEADERS });
    if (!res.ok) {
      setError(`Candidates failed (${res.status})`);
      return;
    }
    setCandidates((await res.json()) as Candidate[]);
  }

  async function assign(assignmentId: string, professionalId: string) {
    setError(null);
    setBlockers([]);
    const res = await fetch(`${API}/assignments/${assignmentId}/assign`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ professionalId }),
    });
    if (res.status === 409) {
      const body = (await res.json()) as { blockers?: Blocker[] };
      setBlockers(body.blockers ?? []);
      setError('Professionista non idoneo');
      return;
    }
    if (!res.ok) {
      setError(`Assign failed (${res.status})`);
      return;
    }
    setSelected(null);
    setCandidates([]);
    await load();
  }

  async function approve(id: string) {
    const res = await fetch(`${API}/assignments/${id}/approve`, {
      method: 'POST',
      headers: HEADERS,
    });
    if (!res.ok) {
      setError(`Approve failed (${res.status})`);
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="eyebrow mb-2">admin</p>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
        Assegnazioni
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Task aperti, candidati idonei (carico crescente) e assegnazione con gate credenziali.
      </p>

      {error ? <p className="mt-4 text-sm text-[var(--clay)]">{error}</p> : null}
      {blockers.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-sm text-[var(--clay)]">
          {blockers.map((b) => (
            <li key={b.code}>{b.messageIt}</li>
          ))}
        </ul>
      ) : null}

      <ul className="mt-8 space-y-4">
        {items.map((a) => (
          <li key={a.id} className="border-b border-[var(--line)] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium font-mono text-sm">{a.id.slice(0, 8)}…</p>
                <p className="text-xs text-[var(--muted)]">
                  {a.status} · task {a.taskId.slice(0, 8)}…
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded border border-[var(--line)] px-3 py-1 text-sm"
                  onClick={() => void loadCandidates(a.id)}
                >
                  Candidati
                </button>
                {a.status === 'DELIVERED' ? (
                  <button
                    type="button"
                    className="rounded bg-[var(--primary)] px-3 py-1 text-sm text-white"
                    onClick={() => void approve(a.id)}
                  >
                    Approva
                  </button>
                ) : null}
              </div>
            </div>

            {selected === a.id ? (
              <ul className="mt-3 space-y-2">
                {candidates.length === 0 ? (
                  <li className="text-sm text-[var(--muted)]">Nessun candidato idoneo</li>
                ) : (
                  candidates.map((c) => (
                    <li key={c.professional.id} className="flex items-center justify-between text-sm">
                      <span>
                        {c.professional.id.slice(0, 8)}… · carico {c.load}/
                        {c.professional.maxConcurrent}
                      </span>
                      <button
                        type="button"
                        className="rounded border border-[var(--line)] px-2 py-1"
                        onClick={() => void assign(a.id, c.professional.id)}
                      >
                        Assegna
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
