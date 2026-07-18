import React from 'react';

import type { CredentialType, Professional } from '@easycasa/api-client';
import { useProfessionals, useVerifyCredential } from '../hooks';
import { Badge, Table, type BadgeVariant } from '../components/ui';

const CRED_STATUS_VARIANT: Record<string, BadgeVariant> = {
  PENDING: 'amber',
  VERIFIED: 'green',
  REJECTED: 'red',
};

interface Row {
  professional: Professional;
  type: CredentialType;
  status: string;
  reference?: string;
  expiresAt?: string;
}

export function Credentials() {
  const { data, isLoading, isError } = useProfessionals();
  const verify = useVerifyCredential();

  if (isLoading) return <p className="muted">Loading professionals…</p>;
  if (isError) return <p className="error">Failed to load professionals.</p>;

  const rows: Row[] = (data ?? []).flatMap((p) =>
    p.credentials.map((c) => ({
      professional: p,
      type: c.type,
      status: c.status,
      ...(c.reference ? { reference: c.reference } : {}),
      ...(c.expiresAt ? { expiresAt: c.expiresAt } : {}),
    })),
  );

  // Pending first — the actual work queue.
  rows.sort((a, b) => (a.status === 'PENDING' ? -1 : 1) - (b.status === 'PENDING' ? -1 : 1));

  return (
    <section>
      <h1>Credential verification</h1>
      <p className="muted">
        A credential only satisfies the assignment gate once verified. Mediation also needs valid RC insurance.
      </p>
      <Table
        columns={['Professional', 'Credential', 'Reference', 'Expires', 'Status', 'Action']}
        empty={rows.length === 0}
      >
        {rows.map((r) => (
          <tr key={`${r.professional.id}-${r.type}`}>
            <td className="mono">{r.professional.id}</td>
            <td>{r.type}</td>
            <td className="mono">{r.reference ?? '—'}</td>
            <td>{r.expiresAt ?? '—'}</td>
            <td>
              <Badge variant={CRED_STATUS_VARIANT[r.status] ?? 'grey'}>{r.status}</Badge>
            </td>
            <td>
              {r.status === 'PENDING' ? (
                <div className="actions">
                  <button
                    className="btn btn--sm btn--primary"
                    disabled={verify.isPending}
                    onClick={() =>
                      verify.mutate({ professionalId: r.professional.id, type: r.type, status: 'VERIFIED' })
                    }
                  >
                    Verify
                  </button>
                  <button
                    className="btn btn--sm btn--danger"
                    disabled={verify.isPending}
                    onClick={() =>
                      verify.mutate({ professionalId: r.professional.id, type: r.type, status: 'REJECTED' })
                    }
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <span className="muted">—</span>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </section>
  );
}
