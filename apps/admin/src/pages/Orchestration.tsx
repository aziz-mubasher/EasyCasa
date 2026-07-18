import React, { useState } from 'react';

import type { Candidate } from '@easycasa/api-client';
import { useApprove, useAssign, useCandidates, useOpenAssignments } from '../hooks';
import { Badge, Table, type BadgeVariant } from '../components/ui';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  REQUESTED: 'blue',
  ASSIGNED: 'amber',
  IN_PROGRESS: 'amber',
  DELIVERED: 'amber',
  APPROVED: 'green',
};

function CandidatePicker({ assignmentId }: { assignmentId: string }) {
  const { data, isLoading } = useCandidates(assignmentId);
  const assign = useAssign();

  if (isLoading) return <span className="muted">Loading candidates…</span>;
  const candidates = data ?? [];
  if (candidates.length === 0) return <span className="muted">No eligible professional.</span>;

  return (
    <div className="candidates">
      {candidates.map((c: Candidate) => (
        <button
          key={c.professional.id}
          className="btn btn--sm"
          disabled={assign.isPending}
          onClick={() => assign.mutate({ assignmentId, professionalId: c.professional.id })}
        >
          {c.professional.id} · load {c.load}
        </button>
      ))}
    </div>
  );
}

export function Orchestration() {
  const { data, isLoading, isError } = useOpenAssignments();
  const approve = useApprove();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <p className="muted">Loading assignments…</p>;
  if (isError) return <p className="error">Failed to load assignments.</p>;

  const rows = data ?? [];

  return (
    <section>
      <h1>Orchestration</h1>
      <p className="muted">Route each task to an eligible professional. Assignment re-checks the credential gate.</p>
      <Table columns={['Assignment', 'Task', 'Status', 'Professional', 'Action']} empty={rows.length === 0}>
        {rows.map((a) => (
          <React.Fragment key={a.id}>
            <tr>
              <td className="mono">{a.id}</td>
              <td className="mono">{a.taskId}</td>
              <td>
                <Badge variant={STATUS_VARIANT[a.status] ?? 'grey'}>{a.status}</Badge>
              </td>
              <td className="mono">{a.professionalId ?? '—'}</td>
              <td>
                {a.status === 'REQUESTED' ? (
                  <button
                    className="btn btn--sm"
                    onClick={() => setExpanded((e) => (e === a.id ? null : a.id))}
                  >
                    {expanded === a.id ? 'Hide' : 'Find candidates'}
                  </button>
                ) : a.status === 'DELIVERED' ? (
                  <button
                    className="btn btn--sm btn--primary"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(a.id)}
                  >
                    Approve
                  </button>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
            {expanded === a.id ? (
              <tr>
                <td colSpan={5} className="subrow">
                  <CandidatePicker assignmentId={a.id} />
                </td>
              </tr>
            ) : null}
          </React.Fragment>
        ))}
      </Table>
    </section>
  );
}
