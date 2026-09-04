import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crmSourceLabel } from '@easycasa/shared';

import { useApi } from '../../api';

type Role = 'seeker' | 'owner' | 'b4a' | 'partner';

export function CrmPipelines({ onOpenContact }: { onOpenContact: (id: string) => void }) {
  const api = useApi();
  const qc = useQueryClient();
  const [role, setRole] = useState<Role>('seeker');
  const [override, setOverride] = useState<{ contactId: string; stage: string } | null>(null);
  const [note, setNote] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm', 'pipeline', role],
    queryFn: () => api.crmPipeline(role),
  });

  const move = useMutation({
    mutationFn: () => {
      if (!override) throw new Error('no override');
      return api.crmPatchRole(override.contactId, role, { stage: override.stage, note });
    },
    onSuccess: () => {
      setOverride(null);
      setNote('');
      void qc.invalidateQueries({ queryKey: ['crm', 'pipeline', role] });
    },
  });

  return (
    <div>
      <div className="crm-filters">
        {(['seeker', 'owner', 'b4a', 'partner'] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            className={`btn btn--sm${role === r ? ' btn--primary' : ''}`}
            onClick={() => setRole(r)}
          >
            {r}
          </button>
        ))}
        {data?.readOnly ? <span className="muted">B4A board is read-only (sweep-driven)</span> : null}
      </div>
      {isLoading ? <p className="muted">Loading pipeline…</p> : null}
      {isError ? <p className="error">Failed to load pipeline.</p> : null}
      <div className="crm-kanban">
        {(data?.columns ?? []).map((col) => (
          <div key={col.stage} className="crm-kanban__col">
            <h3>
              {col.stage.replace(/_/g, ' ')} <span className="mono">{col.count}</span>
            </h3>
            <ul>
              {col.cards.map((card) => (
                <li key={card.contactId}>
                  <button type="button" className="linkish" onClick={() => onOpenContact(card.contactId)}>
                    {card.fullName}
                  </button>
                  {card.source ? (
                    <span className="muted crm-kanban__source">{crmSourceLabel(card.source)}</span>
                  ) : null}
                  {!data?.readOnly && role === 'seeker' ? (
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() => setOverride({ contactId: card.contactId, stage: col.stage })}
                    >
                      Override…
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {override ? (
        <div className="crm-modal">
          <h3>Manual stage override</h3>
          <p className="muted">Event-driven stages require a note (audit-logged).</p>
          <select
            className="input"
            value={override.stage}
            onChange={(e) => setOverride({ ...override, stage: e.target.value })}
          >
            {(data?.columns ?? []).map((c) => (
              <option key={c.stage} value={c.stage}>
                {c.stage}
              </option>
            ))}
          </select>
          <textarea
            className="input"
            rows={3}
            placeholder="Required note for override"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="crm-filters">
            <button type="button" className="btn" onClick={() => setOverride(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!note.trim() || move.isPending}
              onClick={() => move.mutate()}
            >
              Save override
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
