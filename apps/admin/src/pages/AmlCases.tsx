import React from 'react';

import type { KycCase } from '@easycasa/api-client';
import { useAdvanceKyc, useKycCases } from '../hooks';
import { Badge, Table } from '../components/ui';
import { riskVariant } from '../lib/format';

const STATUS_VARIANT = {
  OPEN: 'blue',
  VERIFIED: 'green',
  ESCALATED: 'red',
  CLEARED: 'grey',
} as const;

export function AmlCases() {
  const { data, isLoading, isError } = useKycCases();
  const advance = useAdvanceKyc();

  if (isLoading) return <p className="muted">Loading cases…</p>;
  if (isError) return <p className="error">Failed to load KYC cases.</p>;

  const cases = data ?? [];

  const actionsFor = (c: KycCase) => {
    // Escalation guard mirrored in the UI: a case that must escalate can't be verified directly.
    const canVerify = c.status === 'OPEN' && !c.assessment.mustEscalate;
    return (
      <div className="actions">
        {canVerify ? (
          <button className="btn btn--sm btn--primary" onClick={() => advance.mutate({ id: c.id, event: 'VERIFY' })}>
            Verify
          </button>
        ) : null}
        {c.status === 'OPEN' || c.status === 'VERIFIED' ? (
          <button className="btn btn--sm btn--danger" onClick={() => advance.mutate({ id: c.id, event: 'ESCALATE' })}>
            Escalate (SOS)
          </button>
        ) : null}
        {c.status === 'VERIFIED' || c.status === 'ESCALATED' ? (
          <button className="btn btn--sm" onClick={() => advance.mutate({ id: c.id, event: 'CLEAR' })}>
            Clear
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <section>
      <h1>AML / KYC cases</h1>
      <p className="muted">
        Adeguata verifica (D.Lgs 231/2007). A sanctions hit forces escalation before a case can be verified.
      </p>
      <Table columns={['Subject', 'Risk', 'Measure', 'Score', 'Status', 'Action']} empty={cases.length === 0}>
        {cases.map((c) => (
          <tr key={c.id}>
            <td className="mono">{c.subjectRef}</td>
            <td>
              <Badge variant={riskVariant(c.assessment.level)}>{c.assessment.level}</Badge>
              {c.assessment.mustEscalate ? <Badge variant="red">SOS</Badge> : null}
            </td>
            <td>{c.assessment.measure}</td>
            <td className="mono">{c.assessment.score}</td>
            <td>
              <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
            </td>
            <td>{actionsFor(c)}</td>
          </tr>
        ))}
      </Table>
    </section>
  );
}
