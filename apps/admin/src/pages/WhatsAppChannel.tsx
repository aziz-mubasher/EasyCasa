import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useApi } from '../api';
import { Badge } from '../components/ui';
import { WhatsAppInbound } from './WhatsAppInbound';

const HUB_TABS = ['inbox', 'connection', 'templates', 'canned', 'analytics'] as const;
type HubTab = (typeof HUB_TABS)[number];

function tabFromHash(): HubTab {
  if (typeof window === 'undefined') return 'inbox';
  const raw = window.location.hash.replace(/^#/, '');
  const rest = raw.replace(/^whatsapp\/?/, '');
  if (!rest || /^[0-9a-f]{32}$/i.test(rest)) return 'inbox';
  if ((HUB_TABS as readonly string[]).includes(rest)) return rest as HubTab;
  return 'inbox';
}

const ConnectionSchema = z.object({
  provider: z.string(),
  graphVersion: z.string(),
  configured: z.boolean(),
  demoMode: z.boolean(),
  tokenSet: z.boolean(),
  phoneNumberIdSet: z.boolean(),
  phoneNumberIdLast4: z.string().nullable(),
  appSecretSet: z.boolean(),
  verifyTokenSet: z.boolean(),
  handleSecretSet: z.boolean(),
  publicWebhookPath: z.string(),
  publicWebhookStatusPath: z.string(),
  businessNumber: z.string().nullable(),
  publicSiteUrl: z.string(),
  lastInboundAt: z.string().nullable(),
  signatureRejectedTotal: z.number(),
  ownWaba: z.boolean(),
  notes: z.array(z.string()),
});

const TemplatesSchema = z.object({
  localeDefault: z.string(),
  sessionVsTemplate: z.string(),
  marketingTemplates: z.boolean(),
  items: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      configured: z.boolean(),
      kind: z.enum(['authentication', 'utility']),
    }),
  ),
});

const CannedSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      body: z.string(),
      locale: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
});

const AnalyticsSchema = z.object({
  periodDays: z.number(),
  viewingsInPeriod: z.number(),
  reminderRows: z.number(),
  reminderDeliveredRecipients: z.number(),
  reminderDeliveryRate: z.number().nullable(),
  noShowWithDeliveredReminder: z.number().optional(),
}).passthrough();

function ConnectionTab() {
  const api = useApi();
  const q = useQuery({
    queryKey: ['wa-hub-connection'],
    queryFn: async () => ConnectionSchema.parse(await api.getWhatsAppHubConnection()),
    refetchInterval: 30_000,
  });
  const d = q.data;
  return (
    <section className="ecwa-hub">
      <h2 className="ecwa-hub__title">Connection</h2>
      <p className="muted">
        One Meta Cloud API number. This Hub is an operator console on the same API — Meta never
        calls it.
      </p>
      {q.isLoading ? <p className="muted">Loading…</p> : null}
      {q.isError ? <p className="error">Failed to load connection (needs WhatsApp inbox read).</p> : null}
      {d ? (
        <>
          <dl className="ecwa-hub__dl">
            <div>
              <dt>Provider</dt>
              <dd className="mono">{d.provider} · Graph {d.graphVersion}</dd>
            </div>
            <div>
              <dt>Cloud send</dt>
              <dd>{d.configured ? 'ready' : d.demoMode ? 'demo (sends off)' : 'not configured'}</dd>
            </div>
            <div>
              <dt>Secrets present</dt>
              <dd className="mono">
                token {d.tokenSet ? 'yes' : 'no'} · phone_id {d.phoneNumberIdSet ? `…${d.phoneNumberIdLast4}` : 'no'} ·
                app_secret {d.appSecretSet ? 'yes' : 'no'} · verify {d.verifyTokenSet ? 'yes' : 'no'} ·
                handle {d.handleSecretSet ? 'yes' : 'no'}
              </dd>
            </div>
            <div>
              <dt>Public webhook</dt>
              <dd className="mono">{d.publicWebhookPath}</dd>
            </div>
            <div>
              <dt>Health</dt>
              <dd className="mono">{d.publicWebhookStatusPath}</dd>
            </div>
            <div>
              <dt>EC number</dt>
              <dd className="mono">{d.businessNumber || 'set WHATSAPP_BUSINESS_NUMBER to display'}</dd>
            </div>
            <div>
              <dt>Portal CTA</dt>
              <dd className="mono">{d.publicSiteUrl}</dd>
            </div>
            <div>
              <dt>Last inbound</dt>
              <dd className="mono">{d.lastInboundAt ?? '—'}</dd>
            </div>
            <div>
              <dt>Signature rejects</dt>
              <dd className="mono tabular-nums">{d.signatureRejectedTotal}</dd>
            </div>
            <div>
              <dt>Own WABA</dt>
              <dd>{d.ownWaba ? 'yes — do not share Banks4All’s portfolio' : 'no'}</dd>
            </div>
          </dl>
          <ul className="ecwa-hub__notes">
            {d.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function TemplatesTab() {
  const api = useApi();
  const q = useQuery({
    queryKey: ['wa-hub-templates'],
    queryFn: async () => TemplatesSchema.parse(await api.getWhatsAppHubTemplates()),
  });
  return (
    <section className="ecwa-hub">
      <h2 className="ecwa-hub__title">Templates</h2>
      {q.data ? <p className="muted">{q.data.sessionVsTemplate}</p> : null}
      {q.data && !q.data.marketingTemplates ? (
        <p>
          <Badge variant="blue">utility + auth only</Badge> No marketing templates.
        </p>
      ) : null}
      {q.isError ? <p className="error">Failed to load templates.</p> : null}
      <table className="ecwa-hub__table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Kind</th>
            <th>Name</th>
            <th>Ready</th>
          </tr>
        </thead>
        <tbody>
          {(q.data?.items ?? []).map((t) => (
            <tr key={t.key}>
              <td className="mono">{t.key}</td>
              <td>{t.kind}</td>
              <td className="mono">{t.name || '—'}</td>
              <td>{t.configured ? 'yes' : 'empty (skip)'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CannedTab() {
  const api = useApi();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [locale, setLocale] = useState('it');
  const q = useQuery({
    queryKey: ['wa-hub-canned'],
    queryFn: async () => CannedSchema.parse(await api.listWhatsAppCanned()),
  });
  const create = useMutation({
    mutationFn: () => api.createWhatsAppCanned({ title, body, locale }),
    onSuccess: async () => {
      setTitle('');
      setBody('');
      await qc.invalidateQueries({ queryKey: ['wa-hub-canned'] });
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.deleteWhatsAppCanned(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['wa-hub-canned'] });
    },
  });
  return (
    <section className="ecwa-hub">
      <h2 className="ecwa-hub__title">Canned replies</h2>
      <p className="muted">
        Operator shortcuts for the inbox (IT EN ES UR HI). Session window only — they also
        appear as chips on the pinned reply dock. Do not broadcast.
      </p>
      <form
        className="ecwa-hub__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !body.trim()) return;
          create.mutate();
        }}
      >
        <input
          className="ecwa__composer-input"
          placeholder="Title"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="ecwa__composer-input"
          placeholder="Reply body (portal copy only — no credit / offer language)"
          rows={3}
          maxLength={4096}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="ecwa__composer-row">
          <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="it">IT — Italiano</option>
            <option value="en">EN — English</option>
            <option value="es">ES — Español</option>
            <option value="ur">UR — اردو</option>
            <option value="hi">HI — हिन्दी</option>
          </select>
          <button type="submit" className="btn" disabled={create.isPending || !title.trim() || !body.trim()}>
            {create.isPending ? 'Saving…' : 'Add canned'}
          </button>
        </div>
      </form>
      <ul className="ecwa-hub__canned">
        {(q.data?.items ?? []).map((c) => (
          <li key={c.id}>
            <div>
              <strong>{c.title}</strong> <span className="mono muted">{c.locale}</span>
              <p>{c.body}</p>
            </div>
            <button type="button" className="btn btn--sm" onClick={() => del.mutate(c.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnalyticsTab() {
  const api = useApi();
  const q = useQuery({
    queryKey: ['wa-hub-analytics'],
    queryFn: async () => AnalyticsSchema.parse(await api.getWhatsAppHubAnalytics(90)),
  });
  const d = q.data;
  return (
    <section className="ecwa-hub">
      <h2 className="ecwa-hub__title">Analytics</h2>
      <p className="muted">Utility delivery vs viewing no-show (raw counts, not significance).</p>
      {q.isError ? <p className="error">Failed to load analytics.</p> : null}
      {d ? (
        <dl className="ecwa-hub__dl">
          <div>
            <dt>Period</dt>
            <dd className="mono">{d.periodDays} days</dd>
          </div>
          <div>
            <dt>Viewings</dt>
            <dd className="mono tabular-nums">{d.viewingsInPeriod}</dd>
          </div>
          <div>
            <dt>Reminder rows</dt>
            <dd className="mono tabular-nums">{d.reminderRows}</dd>
          </div>
          <div>
            <dt>Delivered recipients</dt>
            <dd className="mono tabular-nums">{d.reminderDeliveredRecipients}</dd>
          </div>
          <div>
            <dt>Delivery rate</dt>
            <dd className="mono tabular-nums">
              {d.reminderDeliveryRate == null ? '—' : `${Math.round(d.reminderDeliveryRate * 100)}%`}
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

export function WhatsAppChannel() {
  const [tab, setTab] = useState<HubTab>(() => tabFromHash());

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function go(next: HubTab) {
    setTab(next);
    window.location.hash = next === 'inbox' ? 'whatsapp' : `whatsapp/${next}`;
  }

  const labels = useMemo(
    () =>
      ({
        inbox: 'Inbox',
        connection: 'Connection',
        templates: 'Templates',
        canned: 'Canned',
        analytics: 'Analytics',
      }) satisfies Record<HubTab, string>,
    [],
  );

  return (
    <div className="ecwa-shell">
      <nav className="ecwa-tabs" aria-label="EC WhatsApp Hub">
        {HUB_TABS.map((key) => (
          <button
            key={key}
            type="button"
            className={`ecwa-tabs__btn${tab === key ? ' ecwa-tabs__btn--active' : ''}`}
            onClick={() => go(key)}
          >
            {labels[key]}
          </button>
        ))}
      </nav>
      {tab === 'inbox' ? <WhatsAppInbound /> : null}
      {tab === 'connection' ? <ConnectionTab /> : null}
      {tab === 'templates' ? <TemplatesTab /> : null}
      {tab === 'canned' ? <CannedTab /> : null}
      {tab === 'analytics' ? <AnalyticsTab /> : null}
    </div>
  );
}
