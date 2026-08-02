import React, { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { useApi } from '../api';
import { Badge } from '../components/ui';

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

const SummarySchema = z.object({
  threadCount: z.number(),
  messageCount: z.number(),
  openThreadCount: z.number(),
  openMessageCount: z.number(),
  lastReceivedAt: z.string().nullable(),
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

type Thread = z.infer<typeof ThreadSchema>;
type WindowState = Thread['windowState'];

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'closed';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function formatWhen(iso: string): string {
  return iso.replace('T', ' ').slice(0, 16);
}

function WindowCountdown({
  state,
  remainingMs,
}: {
  state: WindowState;
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

function initialsFromMasked(masked: string): string {
  const digits = masked.replace(/\D/g, '');
  if (digits.length >= 2) return digits.slice(-2);
  return 'EC';
}

export function WhatsAppInbound() {
  const api = useApi();
  const [selectedHandle, setSelectedHandle] = useState<string | null>(() => handleFromHash());
  const [windowFilter, setWindowFilter] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    if (selectedHandle) {
      window.location.hash = `whatsapp/${selectedHandle}`;
    } else {
      window.location.hash = 'whatsapp';
    }
  }, [selectedHandle]);

  const summary = useQuery({
    queryKey: ['wa-inbound-summary'],
    queryFn: async () => SummarySchema.parse(await api.getWhatsAppInboundSummary()),
    refetchInterval: 30_000,
  });

  const list = useInfiniteQuery({
    queryKey: ['wa-inbound', windowFilter],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      ListSchema.parse(
        await api.listWhatsAppInbound({
          window: windowFilter === 'all' ? undefined : windowFilter,
          cursor: pageParam,
          limit: 40,
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 20_000,
  });

  const detail = useInfiniteQuery({
    queryKey: ['wa-inbound', selectedHandle, 'messages'],
    enabled: Boolean(selectedHandle),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      if (!selectedHandle) throw new Error('no handle');
      return DetailSchema.parse(
        await api.getWhatsAppInbound(selectedHandle, { cursor: pageParam, limit: 50 }),
      );
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const threads = useMemo(
    () => list.data?.pages.flatMap((p) => p.items) ?? [],
    [list.data],
  );
  const messages = useMemo(
    () => detail.data?.pages.flatMap((p) => p.items) ?? [],
    [detail.data],
  );
  const head = detail.data?.pages[0];
  const empty = !list.isLoading && !list.isError && threads.length === 0;
  const selectedThread = threads.find((t) => t.waHandle === selectedHandle) ?? null;

  return (
    <section className="ecwa">
      <header className="ecwa__header">
        <div>
          <p className="ecwa__eyebrow mono">Inbound · audited</p>
          <h1 className="ecwa__title">EC WhatsApp</h1>
          <p className="ecwa__lede">
            All messages to the EasyCasa Cloud number land here — same inbox pattern as B4A / SV
            WhatsApp, separate store and webhook.
          </p>
        </div>
        <div className="ecwa__stats" aria-live="polite">
          <div className="ecwa__stat">
            <span className="ecwa__stat-label">Threads</span>
            <span className="ecwa__stat-value mono tabular-nums">
              {summary.data?.threadCount ?? '—'}
            </span>
          </div>
          <div className="ecwa__stat">
            <span className="ecwa__stat-label">Messages</span>
            <span className="ecwa__stat-value mono tabular-nums">
              {summary.data?.messageCount ?? '—'}
            </span>
          </div>
          <div className="ecwa__stat">
            <span className="ecwa__stat-label">Open windows</span>
            <span className="ecwa__stat-value mono tabular-nums">
              {summary.data?.openThreadCount ?? '—'}
            </span>
          </div>
        </div>
      </header>

      <div className="ecwa__toolbar">
        <div className="ecwa__filters" role="group" aria-label="Window filter">
          {(
            [
              ['all', 'All'],
              ['open', 'Open window'],
              ['closed', 'Closed'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`ecwa__chip${windowFilter === key ? ' ecwa__chip--active' : ''}`}
              onClick={() => setWindowFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="muted ecwa__cap mono">whatsapp:inbound:read · reply by email (EC-20 later)</p>
      </div>

      <div className={`ecwa__panes${selectedHandle ? ' ecwa__panes--thread' : ''}`}>
        <aside className="ecwa__list" aria-label="Conversations">
          {list.isLoading ? <p className="muted ecwa__pad">Loading conversations…</p> : null}
          {list.isError ? (
            <p className="error ecwa__pad">
              Failed to load (needs support / operations / superadmin).
            </p>
          ) : null}

          {empty ? (
            <div className="wa-empty ecwa__pad">
              <p>No inbound messages yet.</p>
              <p className="muted">
                Meta now delivers <code className="mono">messages</code> to{' '}
                <code className="mono">/api/whatsapp/webhook</code>. Send a test text to the EasyCasa
                number — it should appear here within seconds, with one auto-ack per 24h window.
              </p>
              {summary.data?.lastReceivedAt ? (
                <p className="muted mono">Last seen {formatWhen(summary.data.lastReceivedAt)} UTC</p>
              ) : null}
            </div>
          ) : (
            <ul className="ecwa__threads">
              {threads.map((t) => (
                <li key={t.waHandle}>
                  <button
                    type="button"
                    className={`ecwa__thread${selectedHandle === t.waHandle ? ' ecwa__thread--active' : ''}`}
                    onClick={() => setSelectedHandle(t.waHandle)}
                  >
                    <span className="ecwa__avatar" aria-hidden>
                      {initialsFromMasked(t.waIdMasked)}
                    </span>
                    <span className="ecwa__thread-main">
                      <span className="ecwa__thread-top">
                        <span className="mono">{t.waIdMasked}</span>
                        <span className="ecwa__thread-time mono tabular-nums">
                          {formatWhen(t.lastReceivedAt)}
                        </span>
                      </span>
                      <span className="ecwa__thread-preview">
                        {t.preview || <span className="muted">({t.latestMessageType})</span>}
                      </span>
                      <span className="ecwa__thread-meta">
                        <WindowCountdown state={t.windowState} remainingMs={t.windowRemainingMs} />
                        <span className="mono tabular-nums">{t.messageCount} msg</span>
                        {t.autoRepliedLast24h ? <Badge variant="blue">ack</Badge> : null}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {list.hasNextPage ? (
            <div className="ecwa__pad">
              <button
                type="button"
                className="btn btn--sm"
                disabled={list.isFetchingNextPage}
                onClick={() => void list.fetchNextPage()}
              >
                {list.isFetchingNextPage ? 'Loading…' : 'Load more conversations'}
              </button>
            </div>
          ) : null}
        </aside>

        <div className="ecwa__detail" aria-label="Thread">
          {!selectedHandle ? (
            <div className="ecwa__detail-empty">
              <p className="ecwa__detail-empty-title">Select a conversation</p>
              <p className="muted">
                Opening a thread is audited — who revealed how many messages is written to the admin
                audit log.
              </p>
            </div>
          ) : (
            <>
              <div className="ecwa__detail-bar">
                <button
                  type="button"
                  className="btn btn--sm ecwa__back"
                  onClick={() => setSelectedHandle(null)}
                >
                  ← Inbox
                </button>
                <div>
                  <h2 className="ecwa__detail-title mono">
                    {head?.waIdMasked ?? selectedThread?.waIdMasked ?? '…'}
                  </h2>
                  {head ? (
                    <p className="muted">
                      Window{' '}
                      <WindowCountdown
                        state={head.windowState}
                        remainingMs={head.windowRemainingMs}
                      />
                      {' · '}
                      revealed {messages.length}
                      {head.auditId ? ` · audit ${head.auditId.slice(0, 8)}…` : ''}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="wa-audit-banner" role="status">
                This view is audited. Reply by email — no send from EC WhatsApp yet.
              </div>

              {detail.isLoading ? <p className="muted">Loading messages…</p> : null}
              {detail.isError ? (
                <p className="error">Failed to load thread (needs whatsapp:inbound:read).</p>
              ) : null}

              <ul className="wa-messages ecwa__bubbles">
                {messages.map((m) => (
                  <li key={m.id} className="wa-message ecwa__bubble">
                    <div className="wa-message__meta mono tabular-nums">
                      {formatWhen(m.receivedAt)} UTC · {m.messageType}
                      {m.autoRepliedAt ? ' · auto-replied' : ''}
                    </div>
                    <div className="wa-message__body">
                      {m.body ?? <span className="muted">(no text — {m.messageType})</span>}
                    </div>
                  </li>
                ))}
              </ul>

              {detail.hasNextPage ? (
                <button
                  type="button"
                  className="btn btn--sm"
                  disabled={detail.isFetchingNextPage}
                  onClick={() => void detail.fetchNextPage()}
                >
                  {detail.isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
