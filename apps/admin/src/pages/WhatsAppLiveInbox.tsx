import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useApi } from '../api';

const LOCALES = ['it', 'en', 'es', 'hi', 'ur', 'pa', 'bn', 'ar'] as const;

const ListSchema = z.object({
  items: z.array(z.object({
    conversationId: z.string(),
    startedAt: z.string().nullable(),
    preview: z.string(),
  })),
});

const DetailSchema = z.object({
  conversationId: z.string(),
  startedAt: z.string().nullable(),
  turns: z.array(z.object({
    role: z.enum(['customer', 'agent']),
    text: z.string(),
    atSeconds: z.number().nullable(),
  })),
});

const StatusSchema = z.object({
  configured: z.boolean(),
  phoneLast4: z.string().nullable(),
  callPermission: z.array(z.object({
    locale: z.string(),
    name: z.string(),
    body: z.string(),
  })).optional(),
});

function liveIdFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const rest = window.location.hash.replace(/^#/, '').replace(/^whatsapp\/?/, '');
  const id = rest.replace(/^live\/?/, '');
  return /^conv_[a-z0-9]{8,64}$/.test(id) ? id : null;
}

export function apiErrorText(err: unknown, fallback: string): string {
  const body = err && typeof err === 'object' && 'body' in err ? (err as { body?: unknown }).body : undefined;
  const message = body && typeof body === 'object' && 'message' in body ? (body as { message?: unknown }).message : body;
  if (typeof message === 'string' && message.trim() && !message.startsWith('API ')) return message;
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) return message.join(', ');
  return err instanceof Error && !err.message.startsWith('API ') ? err.message : fallback;
}

export function WhatsAppLiveInbox() {
  const api = useApi();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(() => liveIdFromHash());
  const [staffName, setStaffName] = useState('');
  const [subject, setSubject] = useState('');
  const [locale, setLocale] = useState<(typeof LOCALES)[number]>('it');
  const [callLocale, setCallLocale] = useState('it');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [callSent, setCallSent] = useState(false);

  const status = useQuery({
    queryKey: ['wa-live-status'],
    queryFn: async () => StatusSchema.parse(await api.getWhatsAppLiveStatus()),
  });
  const list = useQuery({
    queryKey: ['wa-live'],
    queryFn: async () => ListSchema.parse(await api.listWhatsAppLive()),
    enabled: status.data?.configured === true,
  });
  const detail = useQuery({
    queryKey: ['wa-live', selected],
    queryFn: async () => DetailSchema.parse(await api.getWhatsAppLive(selected!)),
    enabled: Boolean(selected) && status.data?.configured === true,
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Select a conversation');
      return api.sendWhatsAppLiveFollowUp(selected, { staffName, subject, locale });
    },
    onSuccess: async () => {
      setSendError(null);
      setSent(true);
      setSubject('');
      await qc.invalidateQueries({ queryKey: ['wa-live', selected] });
    },
    onError: (err: unknown) => {
      setSent(false);
      setSendError(apiErrorText(err, 'Send failed'));
    },
  });

  const askCall = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Select a conversation');
      return api.sendWhatsAppLiveCallPermission(selected, callLocale);
    },
    onSuccess: () => {
      setCallError(null);
      setCallSent(true);
    },
    onError: (err: unknown) => {
      setCallSent(false);
      setCallError(apiErrorText(err, 'Call permission failed'));
    },
  });

  const items = useMemo(() => list.data?.items ?? [], [list.data]);

  function open(id: string | null) {
    setSelected(id);
    setSent(false);
    setSendError(null);
    setCallSent(false);
    setCallError(null);
    window.location.hash = id ? `whatsapp/live/${id}` : 'whatsapp/live';
  }

  return (
    <section className="ecwa">
      <div className={`ecwa__panes${selected ? ' ecwa__panes--thread' : ''}`}>
        <aside className="ecwa__list" aria-label="Live conversations">
          <div className="ecwa__list-head">
            <div className="ecwa__list-title-row">
              <h1 className="ecwa__title">Live line</h1>
              <span className="ecwa__stat-value mono">
                {status.data?.phoneLast4 ? `···${status.data.phoneLast4}` : ''}
              </span>
            </div>
            <button type="button" className="ecwa__chip" onClick={() => { window.location.hash = 'whatsapp'; }}>
              Archive
            </button>
          </div>
          {status.data && !status.data.configured ? (
            <p className="muted">The live line key is not set on the server, so new WhatsApp chats cannot load.</p>
          ) : null}
          {list.isError ? <p className="ecwa__error">{apiErrorText(list.error, 'Could not load live chats')}</p> : null}
          <ul className="ecwa__threads">
            {items.map((item) => (
              <li key={item.conversationId}>
                <button
                  type="button"
                  className={`ecwa__thread${item.conversationId === selected ? ' ecwa__thread--active' : ''}`}
                  onClick={() => open(item.conversationId)}
                >
                  <span className="ecwa__thread-name">{item.startedAt ? new Date(item.startedAt).toLocaleString() : 'WhatsApp'}</span>
                  <span className="ecwa__thread-preview">{item.preview || 'No summary'}</span>
                </button>
              </li>
            ))}
          </ul>
          {status.data?.configured && items.length === 0 && !list.isLoading ? (
            <p className="muted">No live WhatsApp chats yet.</p>
          ) : null}
        </aside>
        <div className="ecwa__detail">
          {!selected ? (
            <div className="ecwa__detail-empty">
              <p className="ecwa__detail-empty-title">Select a live conversation</p>
              <p>These are chats on the Easy Casa Italia WhatsApp number. The follow-up template can go out after the 24-hour window closes.</p>
            </div>
          ) : (
            <>
              <ul className="wa-messages ecwa__bubbles ecwa__thread-scroll">
                {(detail.data?.turns ?? []).map((turn, index) => (
                  <li key={`${turn.role}-${index}`} className={turn.role === 'agent' ? 'ecwa__bubble ecwa__bubble--out' : 'ecwa__bubble'}>
                    {turn.text}
                  </li>
                ))}
              </ul>
              {detail.isError ? <p className="ecwa__error">{apiErrorText(detail.error, 'Could not open this chat')}</p> : null}
              <div className="ecwa__compose">
                <div className="ecwa__compose-tabs" role="tablist">
                  <button type="button" role="tab" aria-selected className="ecwa__compose-tab ecwa__compose-tab--active">Template</button>
                </div>
                <div className="ecwa__template-pane">
                  <form
                    className="ecwa__composer-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (askCall.isPending) return;
                      askCall.mutate();
                    }}
                  >
                    <select className="ecwa__line" value={callLocale} onChange={(e) => setCallLocale(e.target.value)} aria-label="Call permission language">
                      {(status.data?.callPermission ?? [{ locale: 'it', name: 'ec_callback_permission', body: '' }]).map((row) => (
                        <option key={row.locale} value={row.locale}>{row.locale}</option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn--sm" disabled={askCall.isPending}>
                      Ask to call on WhatsApp
                    </button>
                  </form>
                  <form
                    className="ecwa__composer-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!staffName.trim() || !subject.trim() || send.isPending) return;
                      send.mutate();
                    }}
                  >
                    <input className="ecwa__line" placeholder="Your name" value={staffName} maxLength={80} onChange={(e) => setStaffName(e.target.value)} />
                    <input className="ecwa__line" placeholder="What they asked about" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} />
                    <select className="ecwa__line" value={locale} onChange={(e) => setLocale(e.target.value as (typeof LOCALES)[number])} aria-label="Follow-up language">
                      {LOCALES.map((code) => <option key={code} value={code}>{code}</option>)}
                    </select>
                    <button type="submit" className="btn btn--sm" disabled={!staffName.trim() || !subject.trim() || send.isPending}>
                      Send follow-up
                    </button>
                  </form>
                  {sent || callSent ? <p className="muted">Template sent.</p> : null}
                  {sendError || callError ? <p className="ecwa__error">{sendError || callError}</p> : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
