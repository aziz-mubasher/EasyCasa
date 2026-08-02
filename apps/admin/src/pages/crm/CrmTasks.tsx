import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '../../api';
import { Badge, Table } from '../../components/ui';

export function CrmTasks({ onOpenContact }: { onOpenContact: (id: string) => void }) {
  const api = useApi();
  const qc = useQueryClient();
  const [assignee, setAssignee] = useState<'me' | ''>('me');
  const [status, setStatus] = useState<'open' | 'done' | 'cancelled' | ''>('open');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm', 'tasks', assignee, status],
    queryFn: () =>
      api.crmListTasks({
        assignee: assignee || undefined,
        status: status || undefined,
      }),
  });

  const complete = useMutation({
    mutationFn: (id: string) => api.crmPatchTask(id, { status: 'done' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['crm', 'tasks'] }),
  });

  return (
    <div>
      <div className="crm-filters">
        <select
          className="input"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value as 'me' | '')}
        >
          <option value="me">My tasks</option>
          <option value="">Team</option>
        </select>
        <select
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="open">Open</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
          <option value="">All</option>
        </select>
      </div>
      {isLoading ? <p className="muted">Loading tasks…</p> : null}
      {isError ? <p className="error">Failed to load tasks.</p> : null}
      <Table columns={['Title', 'Due', 'Status', '']} empty={!data?.items.length}>
        {(data?.items ?? []).map((t) => (
          <tr key={t.id}>
            <td>
              <button type="button" className="linkish" onClick={() => onOpenContact(t.contactId)}>
                {t.title}
              </button>
            </td>
            <td className="mono">
              {t.dueAt ? new Date(t.dueAt).toLocaleString('it-IT') : '—'}
            </td>
            <td>
              <Badge variant={t.status === 'done' ? 'green' : 'amber'}>{t.status}</Badge>
            </td>
            <td>
              {t.status === 'open' ? (
                <button
                  type="button"
                  className="btn btn--sm"
                  disabled={complete.isPending}
                  onClick={() => complete.mutate(t.id)}
                >
                  Done
                </button>
              ) : (
                '—'
              )}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
