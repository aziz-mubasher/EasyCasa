import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useApi } from '../api';
import { Badge } from '../components/ui';
import {
  formatClock,
  formatRemaining,
  formatThreadWhen,
  threadPhone,
} from './whatsapp-inbound-format';

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

export function WhatsAppInbound() {
  const api = useApi();
  const qc = useQueryClient();
  const [selectedHandle, setSelectedHandle] = useState<string | null>(() => handleFromHash());
  const [windowFilter, setWindowFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

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
    stickToBottom.current = true;
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
      stickToBottom.current = true;
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
  const contactTitle =
    head?.contactName?.trim() ||
    selectedThread?.contactName?.trim() ||
    threadPhone({
      waIdE164: head?.waIdE164,
      waId: head?.waId,
      waIdMasked: head?.waIdMasked ?? selectedThread?.waIdMasked,
    }) ||
    '…';
  const contactPhone = threadPhone({
    waIdE164: head?.waIdE164,
    waId: head?.waId,
    waIdMasked: head?.waIdMasked ?? selectedThread?.waIdMasked,
  });

  useEffect(() => {
    const el = threadScrollRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, selectedHandle]);

  function sendReply() {
    const body = replyText.trim();
    if (!body || !canReply || reply.isPending) return;
    reply.mutate(body);
  }

  return (
    <section className="ecwa">
      <div className={`ecwa__panes${selectedHandle ? ' ecwa__panes--thread' : ''}`}>
        <aside className="ecwa__list" aria-label="Conversations">
          <div className="ecwa__list-head">
            <div className="ecwa__list-title-row">
              <h1 className="ecwa__title">EC WhatsApp</h1>
              <span className="ecwa__stat-value mono tabular-nums">
                {summary.data?.openThreadCount ?? '—'}
              </span>
            </div>
            <div className="ecwa__filters" role="group" aria-label="Window filter">
              {(
                [
                  ['all', 'All'],
                  ['open', 'Open'],
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
                          {t.contactName?.trim() || t.waIdMasked}
                        </span>
                        <span className="ecwa__thread-time mono tabular-nums">
                          {formatThreadWhen(t.lastReceivedAt)}
                        </span>
                      </span>
                      <span className="ecwa__thread-preview">
                        {t.preview || <span className="muted">({t.latestMessageType})</span>}
                      </span>
                      <span className="ecwa__thread-meta">
                        <WindowCountdown state={t.windowState} remainingMs={t.windowRemainingMs} />
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
              <p className="muted">Chat fills this pane, like WhatsApp Web.</p>
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
                <span className="ecwa__avatar" aria-hidden>
                  {initialsFromThread({
                    contactName: head?.contactName ?? selectedThread?.contactName,
                    waIdMasked: head?.waIdMasked ?? selectedThread?.waIdMasked ?? '',
                  })}
                </span>
                <div className="ecwa__detail-identity">
                  <h2 className="ecwa__detail-title">{contactTitle}</h2>
                  {contactPhone && contactPhone !== contactTitle ? (
                    <p className="ecwa__detail-phone">{contactPhone}</p>
                  ) : null}
                </div>
                {head ? (
                  <WindowCountdown state={head.windowState} remainingMs={head.windowRemainingMs} />
                ) : null}
              </div>

              <div
                className="ecwa__thread-scroll"
                ref={threadScrollRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                }}
              >
                {detail.hasNextPage ? (
                  <button
                    type="button"
                    className="btn btn--sm ecwa__earlier"
                    disabled={detail.isFetchingNextPage}
                    onClick={() => {
                      stickToBottom.current = false;
                      void detail.fetchNextPage();
                    }}
                  >
                    {detail.isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
                  </button>
                ) : null}

                {detail.isLoading ? <p className="muted ecwa__pad">Loading messages…</p> : null}
                {detail.isError ? (
                  <p className="error ecwa__pad">
                    Failed to load thread (needs whatsapp:inbound:read).
                  </p>
                ) : null}

                <ul className="wa-messages ecwa__bubbles">
                  {messages.map((m) => (
                    <li
                      key={m.id}
                      className={`wa-message ecwa__bubble${
                        m.direction === 'outbound' ? ' ecwa__bubble--out' : ' ecwa__bubble--in'
                      }`}
                    >
                      <div className="wa-message__body">
                        {m.body ?? <span className="muted">({m.messageType})</span>}
                      </div>
                      <time className="wa-message__time mono tabular-nums" dateTime={m.at}>
                        {formatClock(m.at)}
                      </time>
                    </li>
                  ))}
                </ul>
              </div>

              <form
                className="ecwa__composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendReply();
                }}
              >
                <label className="ec-sr-only" htmlFor="ecwa-reply">
                  Reply
                </label>
                <textarea
                  id="ecwa-reply"
                  className="ecwa__composer-input"
                  rows={1}
                  maxLength={4096}
                  placeholder={
                    canReply ? 'Type a message' : 'Window closed — reply unavailable'
                  }
                  value={replyText}
                  disabled={!canReply || reply.isPending}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                />
                <button
                  type="submit"
                  className="btn ecwa__send"
                  disabled={!canReply || reply.isPending || !replyText.trim()}
                >
                  {reply.isPending ? '…' : 'Send'}
                </button>
                {replyError ? <p className="error ecwa__composer-error">{replyError}</p> : null}
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
