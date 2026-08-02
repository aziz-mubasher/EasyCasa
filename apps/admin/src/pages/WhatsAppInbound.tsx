import React, { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useApi } from '../api';
import { Badge } from '../components/ui';

const ThreadSchema = z.object({
  waIdMasked: z.string(),
  waHandle: z.string(),
  contactName: z.string().nullable().optional(),
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

const TimelineItemSchema = z.object({
  direction: z.enum(['inbound', 'outbound']),
  id: z.string(),
  at: z.string(),
  messageType: z.string(),
  body: z.string().nullable(),
  providerMessageId: z.string().nullable(),
  phoneNumberId: z.string().nullable(),
  contactName: z.string().nullable(),
  windowExpiresAt: z.string().nullable(),
  autoRepliedAt: z.string().nullable(),
  forwardedAt: z.string().nullable(),
  forwardError: z.string().nullable(),
  createdAt: z.string().nullable(),
  source: z.enum(['auto_ack', 'operator']).nullable(),
  actorUserId: z.string().nullable(),
});

const DetailSchema = z.object({
  waHandle: z.string(),
  waId: z.string(),
  waIdMasked: z.string(),
  waIdE164: z.string().optional(),
  contactName: z.string().nullable().optional(),
  canReply: z.boolean().optional(),
  windowState: z.enum(['open', 'closing_soon', 'closed']),
  windowExpiresAt: z.string().nullable(),
  windowRemainingMs: z.number(),
  auditId: z.string(),
  messagesRevealed: z.number(),
  items: z.array(TimelineItemSchema),
  nextCursor: z.string().nullable(),
});

type Thread = z.infer<typeof ThreadSchema>;
type WindowState = Thread['windowState'];
type TimelineItem = z.infer<typeof TimelineItemSchema>;

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'closed';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function formatWhen(iso: string): string {
  return iso.replace('T', ' ').slice(0, 19);
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

function initialsFromThread(t: Pick<Thread, 'contactName' | 'waIdMasked'>): string {
  const name = t.contactName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  const digits = t.waIdMasked.replace(/\D/g, '');
  if (digits.length >= 2) return digits.slice(-2);
  return 'EC';
}

function MessageDetails({ m }: { m: TimelineItem }) {
  const rows: { label: string; value: string }[] = [];
  if (m.providerMessageId) rows.push({ label: 'wamid', value: m.providerMessageId });
  if (m.phoneNumberId) rows.push({ label: 'phone_number_id', value: m.phoneNumberId });
  if (m.contactName) rows.push({ label: 'contact', value: m.contactName });
  if (m.windowExpiresAt) rows.push({ label: 'window_expires', value: formatWhen(m.windowExpiresAt) });
  if (m.autoRepliedAt) rows.push({ label: 'auto_replied', value: formatWhen(m.autoRepliedAt) });
  if (m.forwardedAt) rows.push({ label: 'ops_forwarded', value: formatWhen(m.forwardedAt) });
  if (m.forwardError) rows.push({ label: 'forward_error', value: m.forwardError });
  if (m.createdAt) rows.push({ label: 'stored', value: formatWhen(m.createdAt) });
  if (m.source) rows.push({ label: 'source', value: m.source });
  if (m.actorUserId) rows.push({ label: 'actor', value: m.actorUserId });
  if (!rows.length) return null;
  return (
    <dl className="ecwa__details">
      {rows.map((r) => (
        <div key={r.label} className="ecwa__details-row">
          <dt className="mono">{r.label}</dt>
          <dd className="mono">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function WhatsAppInbound() {
  const api = useApi();
  const qc = useQueryClient();
  const [selectedHandle, setSelectedHandle] = useState<string | null>(() => handleFromHash());
  const [windowFilter, setWindowFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedHandle) {
      window.location.hash = `whatsapp/${selectedHandle}`;
    } else {
      window.location.hash = 'whatsapp';
    }
  }, [selectedHandle]);

  useEffect(() => {
    setReplyText('');
    setReplyError(null);
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

  const reply = useMutation({
    mutationFn: async (body: string) => {
      if (!selectedHandle) throw new Error('no handle');
      return api.replyWhatsAppInbound(selectedHandle, body);
    },
    onSuccess: async () => {
      setReplyText('');
      setReplyError(null);
      await qc.invalidateQueries({ queryKey: ['wa-inbound', selectedHandle, 'messages'] });
      await qc.invalidateQueries({ queryKey: ['wa-inbound'] });
      await qc.invalidateQueries({ queryKey: ['wa-inbound-summary'] });
    },
    onError: (err: unknown) => {
      setReplyError(err instanceof Error ? err.message : 'Reply failed');
    },
  });

  const threads = useMemo(
    () => list.data?.pages.flatMap((p) => p.items) ?? [],
    [list.data],
  );
  const messages = useMemo(() => {
    const seen = new Set<string>();
    const out: TimelineItem[] = [];
    for (const page of detail.data?.pages ?? []) {
      for (const item of page.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        out.push(item);
      }
    }
    return out.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  }, [detail.data]);
  const head = detail.data?.pages[0];
  const empty = !list.isLoading && !list.isError && threads.length === 0;
  const selectedThread = threads.find((t) => t.waHandle === selectedHandle) ?? null;
  const canReply = Boolean(head?.canReply);

  return (
    <section className="ecwa">
      <header className="ecwa__header">
        <div>
          <p className="ecwa__eyebrow mono">Inbound · audited</p>
          <h1 className="ecwa__title">EC WhatsApp</h1>
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
                Messages to the EasyCasa WhatsApp number appear here automatically.
              </p>
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
                      {initialsFromThread(t)}
                    </span>
                    <span className="ecwa__thread-main">
                      <span className="ecwa__thread-top">
                        <span className="ecwa__thread-name">
                          {t.contactName?.trim() || <span className="mono">{t.waIdMasked}</span>}
                        </span>
                        <span className="ecwa__thread-time mono tabular-nums">
                          {formatWhen(t.lastReceivedAt).slice(0, 16)}
                        </span>
                      </span>
                      {t.contactName ? (
                        <span className="ecwa__thread-phone mono">{t.waIdMasked}</span>
                      ) : null}
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
              <p className="muted">Opening a thread is audited.</p>
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
                <div className="ecwa__detail-identity">
                  <h2 className="ecwa__detail-title">
                    {head?.contactName?.trim() ||
                      head?.waIdMasked ||
                      selectedThread?.contactName ||
                      selectedThread?.waIdMasked ||
                      '…'}
                  </h2>
                  <p className="muted mono">
                    {head?.waIdE164 || (head?.waId ? `+${head.waId}` : null) || '…'}
                    {head?.waIdMasked ? ` · masked ${head.waIdMasked}` : ''}
                  </p>
                  {head ? (
                    <p className="muted">
                      Window{' '}
                      <WindowCountdown
                        state={head.windowState}
                        remainingMs={head.windowRemainingMs}
                      />
                      {head.windowExpiresAt
                        ? ` · expires ${formatWhen(head.windowExpiresAt)} UTC`
                        : ''}
                      {' · '}
                      {head.messagesRevealed} revealed
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="wa-audit-banner" role="status">
                This view is audited. Free-form reply is available only while the 24h window is open.
              </div>

              {detail.isLoading ? <p className="muted">Loading messages…</p> : null}
              {detail.isError ? (
                <p className="error">Failed to load thread (needs whatsapp:inbound:read).</p>
              ) : null}

              <ul className="wa-messages ecwa__bubbles">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={`wa-message ecwa__bubble${
                      m.direction === 'outbound' ? ' ecwa__bubble--out' : ' ecwa__bubble--in'
                    }`}
                  >
                    <div className="wa-message__meta mono tabular-nums">
                      {formatWhen(m.at)} UTC · {m.direction} · {m.messageType}
                      {m.source ? ` · ${m.source}` : ''}
                      {m.autoRepliedAt ? ' · auto-replied' : ''}
                    </div>
                    <div className="wa-message__body">
                      {m.body ?? <span className="muted">(no text — {m.messageType})</span>}
                    </div>
                    <MessageDetails m={m} />
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

              <form
                className="ecwa__composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  const body = replyText.trim();
                  if (!body || !canReply || reply.isPending) return;
                  reply.mutate(body);
                }}
              >
                <label className="ecwa__composer-label" htmlFor="ecwa-reply">
                  Reply on WhatsApp
                </label>
                <textarea
                  id="ecwa-reply"
                  className="ecwa__composer-input"
                  rows={3}
                  maxLength={4096}
                  placeholder={
                    canReply
                      ? 'Type a free-form reply…'
                      : 'Window closed — free-form reply unavailable'
                  }
                  value={replyText}
                  disabled={!canReply || reply.isPending}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <div className="ecwa__composer-row">
                  <span className="muted mono tabular-nums">{replyText.length}/4096</span>
                  <button
                    type="submit"
                    className="btn"
                    disabled={!canReply || reply.isPending || !replyText.trim()}
                  >
                    {reply.isPending ? 'Sending…' : 'Send'}
                  </button>
                </div>
                {replyError ? <p className="error">{replyError}</p> : null}
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
