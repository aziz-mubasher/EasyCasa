import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { useApi } from '../api';
import { Badge, Table } from '../components/ui';

const ThreadSchema = z.object({
  waIdMasked: z.string(),
  waHandle: z.string(),
  messageCount: z.number(),
  lastReceivedAt: z.string(),
  windowExpiresAt: z.string(),
  windowState: z.enum(['open', 'closing_soon', 'closed']),
  windowRemainingMs: z.number(),
  autoRepliedLast24h: z.boolean(),
  latestMessageType: z.string(),
  preview: z.string(),
});

const ListSchema = z.object({
  items: z.array(ThreadSchema),
  nextCursor: z.string().nullable(),
});

const MessageSchema = z.object({
  id: z.string(),
  messageType: z.string(),
  body: z.string().nullable(),
  receivedAt: z.string(),
  windowExpiresAt: z.string(),
  autoRepliedAt: z.string().nullable(),
});

const DetailSchema = z.object({
  waHandle: z.string(),
  waId: z.string(),
  waIdMasked: z.string(),
  windowState: z.enum(['open', 'closing_soon', 'closed']),
  windowExpiresAt: z.string().nullable(),
  windowRemainingMs: z.number(),
  auditId: z.string(),
  messagesRevealed: z.number(),
  items: z.array(MessageSchema),
  nextCursor: z.string().nullable(),
});

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'closed';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function WindowCountdown({
  state,
  remainingMs,
}: {
  state: 'open' | 'closing_soon' | 'closed';
  remainingMs: number;
}) {
  const ochre = state === 'closing_soon';
  const grey = state === 'closed';
  return (
    <span
      className={`wa-window mono tabular-nums${ochre ? ' wa-window--risk' : ''}${grey ? ' wa-window--closed' : ''}`}
    >
      {state === 'closed' ? 'closed' : formatRemaining(remainingMs)}
    </span>
  );
}

function handleFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash.replace(/^#/, '');
  const m = /^whatsapp\/([0-9a-f]{32})$/i.exec(raw);
  return m?.[1] ?? null;
}

export function WhatsAppInbound() {
  const api = useApi();
  const [selectedHandle, setSelectedHandle] = useState<string | null>(() => handleFromHash());

  useEffect(() => {
    if (selectedHandle) {
      window.location.hash = `whatsapp/${selectedHandle}`;
    } else {
      window.location.hash = 'whatsapp';
    }
  }, [selectedHandle]);

  const list = useQuery({
    queryKey: ['wa-inbound'],
    queryFn: async () => ListSchema.parse(await api.listWhatsAppInbound()),
  });

  const detail = useQuery({
    queryKey: ['wa-inbound', selectedHandle],
    enabled: Boolean(selectedHandle),
    queryFn: async () => {
      if (!selectedHandle) throw new Error('no handle');
      return DetailSchema.parse(await api.getWhatsAppInbound(selectedHandle));
    },
  });

  const rows = list.data?.items ?? [];
  const empty = !list.isLoading && !list.isError && rows.length === 0;

  const detailTitle = useMemo(() => {
    if (!selectedHandle) return null;
    return detail.data?.waIdMasked ?? '…';
  }, [selectedHandle, detail.data?.waIdMasked]);

  if (selectedHandle) {
    return (
      <section>
        <button type="button" className="btn btn--sm" onClick={() => setSelectedHandle(null)}>
          ← Back to inbound
        </button>
        <h1 style={{ marginTop: '1rem' }}>Thread {detailTitle}</h1>
        <div className="wa-audit-banner" role="status">
          This view is audited. Opening a thread records who revealed how many messages.
        </div>
        {detail.isLoading ? <p className="muted">Loading messages…</p> : null}
        {detail.isError ? (
          <p className="error">Failed to load thread (needs whatsapp:inbound:read).</p>
        ) : null}
        {detail.data ? (
          <>
            <p className="muted">
              Window{' '}
              <WindowCountdown
                state={detail.data.windowState}
                remainingMs={detail.data.windowRemainingMs}
              />
              {' · '}
              revealed {detail.data.messagesRevealed} · audit {detail.data.auditId.slice(0, 8)}…
            </p>
            <ul className="wa-messages">
              {detail.data.items.map((m) => (
                <li key={m.id} className="wa-message">
                  <div className="wa-message__meta mono tabular-nums">
                    {m.receivedAt.replace('T', ' ').slice(0, 19)} UTC · {m.messageType}
                    {m.autoRepliedAt ? ' · auto-replied' : ''}
                  </div>
                  <div className="wa-message__body">
                    {m.body ?? <span className="muted">(no text — {m.messageType})</span>}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    );
  }

  return (
    <section>
      <h1>WhatsApp inbound</h1>
      <p className="muted">
        Read-only. Reply by email — no send affordance here. Capability{' '}
        <code className="mono">whatsapp:inbound:read</code>.
      </p>

      {list.isLoading ? <p className="muted">Loading inbound…</p> : null}
      {list.isError ? (
        <p className="error">Failed to load (needs support / operations / superadmin).</p>
      ) : null}

      {empty ? (
        <div className="wa-empty">
          <p>
            Inbound messages will appear here when seekers write to the EasyCasa WhatsApp number.
          </p>
          <p className="muted">
            Meanwhile ops gets a subject-line email alert pointing at this screen — message bodies
            stay in the audited portal, not the mailbox.
          </p>
        </div>
      ) : (
        <Table
          columns={['Sender', 'Msgs', 'Last received', 'Window', 'Preview']}
          empty={rows.length === 0}
        >
          {rows.map((r) => (
            <tr key={r.waHandle}>
              <td>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => setSelectedHandle(r.waHandle)}
                >
                  <span className="mono">{r.waIdMasked}</span>
                </button>
              </td>
              <td className="mono tabular-nums">{r.messageCount}</td>
              <td className="mono tabular-nums">
                {r.lastReceivedAt.replace('T', ' ').slice(0, 16)}
              </td>
              <td>
                <WindowCountdown state={r.windowState} remainingMs={r.windowRemainingMs} />
                {r.autoRepliedLast24h ? (
                  <>
                    {' '}
                    <Badge variant="blue">ack</Badge>
                  </>
                ) : null}
              </td>
              <td className="wa-preview">
                <span className="muted">{r.latestMessageType}</span>
                {r.preview ? ` — ${r.preview.slice(0, 80)}` : ''}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}
