import React, { useEffect, useMemo, useState } from 'react';

import { useApi } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { adminRolesFromAccessToken } from '../../auth/roles';

type Tab = 'inbox' | 'routing' | 'team';

type Summary = {
  callsToday: number;
  waiting: number;
  oldestWaitingAt: string | null;
  overdue: number;
  noOwner: number;
  retention: string;
};

type QueueItem = {
  id: string;
  name: string;
  language: string;
  line: 'easy_casa' | 'easy_legenda';
  role: string;
  words: string;
  status: string;
  overdue: boolean;
  noOwner: boolean;
  deadlineLabel: string;
};

type Suggestion = { start: string; end: string; profileId: string; reason: string; backup: boolean };

type Detail = {
  id: string;
  name: string;
  phone: string;
  language: string;
  lineLabel: string;
  roleLabel: string;
  words: string;
  status: string;
  ownerName: string;
  backupName: string | null;
  suggestions: Suggestion[];
  preview: string;
  canListen: boolean;
  call: {
    summary: string;
    title: string;
    durationSecs: number;
    evaluations: Record<string, string>;
    elevenlabsUrl: string | null;
  } | null;
  events: Array<{ id: string; action: string; createdAt: string; actorUserId: string | null }>;
  retention: string;
};

type Profile = {
  id: string;
  kind: 'person' | 'team_queue';
  adminUserId: string | null;
  name: string;
  email: string;
  whatsappE164: string | null;
  languages: string[];
  callbackMin: number;
  gapMin: number;
  maxPerDay: number | null;
  earliestMin: number;
  weekly: Array<{ weekday: number; startMin: number; endMin: number }>;
  timeOff: Array<{ startDate: string; endDate: string; weekdays: number[] | null }>;
};

type RouteRow = {
  id: string;
  calledNumber: string;
  language: string;
  line: 'easy_casa' | 'easy_legenda' | null;
  forwardProfileId: string;
  backupProfileId: string | null;
  confirmWithin: '2h' | '4h' | '1d';
  alertWhatsapp: boolean;
  alertEmail: boolean;
  offerRealSlots: boolean;
};

const LANGS = ['it', 'en', 'es', 'fr', 'de', 'pt', 'ur', 'hi', 'pa', 'bn', 'ar'] as const;
const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const DAYS = [
  { n: 1, label: 'Mon' },
  { n: 2, label: 'Tue' },
  { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' },
  { n: 5, label: 'Fri' },
  { n: 6, label: 'Sat' },
  { n: 7, label: 'Sun' },
];

function tabFromHash(): Tab {
  const h = window.location.hash.replace(/^#/, '');
  if (h.startsWith('callbacks/routing')) return 'routing';
  if (h.startsWith('callbacks/team')) return 'team';
  return 'inbox';
}

function ageLabel(iso: string | null): string {
  if (!iso) return '—';
  const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  return h < 1 ? 'under 1 h' : `${h} h`;
}

function waLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

export function CallbacksShell() {
  const api = useApi();
  const { accessToken } = useAuth();
  const canEdit = useMemo(() => {
    const roles = adminRolesFromAccessToken(accessToken);
    return roles.includes('operations') || roles.includes('superadmin');
  }, [accessToken]);
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [identity, setIdentity] = useState<{ denominazione: string; piva: string; pivaPlaceholder: boolean; retention: string } | null>(null);

  useEffect(() => {
    void api.callbacksIdentity().then(setIdentity).catch(() => setIdentity(null));
  }, [api]);

  function go(next: Tab) {
    setTab(next);
    window.location.hash = next === 'inbox' ? 'callbacks' : `callbacks/${next}`;
  }

  return (
    <section className="cb">
      <header className="cb__header">
        <div>
          <p className="cb__eyebrow">Voice · contact handling</p>
          <h1>Callbacks</h1>
          <p className="muted">
            Calls to the Easy Casa line. A person confirms every callback. Nothing here is passed to a seller or a partner.
          </p>
        </div>
        <nav className="crm__tabs" aria-label="Callbacks">
          {(['inbox', 'routing', 'team'] as const).map((key) => (
            <button key={key} type="button" className={`btn btn--sm${tab === key ? ' btn--primary' : ''}`} onClick={() => go(key)}>
              {key === 'inbox' ? 'Inbox' : key === 'routing' ? 'Routing' : 'Team availability'}
            </button>
          ))}
        </nav>
      </header>
      {tab === 'inbox' ? <Inbox api={api} /> : null}
      {tab === 'routing' ? <Routing api={api} canEdit={canEdit} /> : null}
      {tab === 'team' ? <Team api={api} canEdit={canEdit} /> : null}
      <p className="muted cb__foot">
        {identity ? (
          <>
            Controller on file: {identity.denominazione}
            {identity.piva ? ` · ${identity.piva}` : ''}
            {identity.pivaPlaceholder ? ' (placeholder P.IVA)' : ''}. {identity.retention}
          </>
        ) : null}
      </p>
    </section>
  );
}

function Inbox({ api }: { api: ReturnType<typeof useApi> }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [chip, setChip] = useState('requested');
  const [owner, setOwner] = useState('');
  const [line, setLine] = useState('');
  const [role, setRole] = useState('');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [calls, setCalls] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [sum, box, log] = await Promise.all([
        api.callbacksSummary(),
        api.callbacksInbox({ chip, owner, line, role }),
        api.callbacksCalls(1),
      ]);
      setSummary(sum as unknown as Summary);
      const inbox = box as { counts: Record<string, number>; items: QueueItem[] };
      setCounts(inbox.counts);
      setItems(inbox.items);
      setCalls(((log as { items: Array<Record<string, unknown>> }).items) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load callbacks');
    }
  }

  useEffect(() => {
    void load();
  }, [chip, owner, line, role]);

  const chips = [
    ['requested', 'Requested'],
    ['held', 'Held'],
    ['overdue', 'Overdue'],
    ['no_owner', 'No owner'],
    ['confirmed', 'Confirmed'],
    ['all', 'All'],
  ] as const;

  return (
    <div>
      {error ? <p className="cb__error">{error}</p> : null}
      <div className="cb__cards">
        <button type="button" className="cb__card" onClick={() => setChip('all')}>
          <span>Calls today</span>
          <strong>{summary?.callsToday ?? '—'}</strong>
        </button>
        <button type="button" className="cb__card" onClick={() => setChip('requested')}>
          <span>Waiting to confirm</span>
          <strong>{summary?.waiting ?? '—'}</strong>
          <em>oldest {ageLabel(summary?.oldestWaitingAt ?? null)}</em>
        </button>
        <button type="button" className="cb__card" onClick={() => setChip('overdue')}>
          <span>Overdue</span>
          <strong>{summary?.overdue ?? '—'}</strong>
        </button>
        <button type="button" className="cb__card" onClick={() => setChip('no_owner')}>
          <span>No owner</span>
          <strong>{summary?.noOwner ?? '—'}</strong>
        </button>
      </div>
      <div className="cb__filters">
        {chips.map(([key, label]) => (
          <button key={key} type="button" className={`btn btn--sm${chip === key ? ' btn--primary' : ''}`} onClick={() => setChip(key)}>
            {label} {counts[key] ?? 0}
          </button>
        ))}
        <select value={line} onChange={(e) => setLine(e.target.value)} aria-label="Line">
          <option value="">All lines</option>
          <option value="easy_casa">Easy Casa</option>
          <option value="easy_legenda">Easy Legenda</option>
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
          <option value="">All roles</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="auction">Auction</option>
          <option value="info">Info</option>
        </select>
        <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Owner id" aria-label="Owner" />
      </div>
      <div className="cb__split">
        <ul className="cb__queue">
          {items.length === 0 ? <li className="muted">Nothing in this filter.</li> : null}
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className={`cb__row${selected === item.id ? ' cb__row--on' : ''}`} onClick={() => setSelected(item.id)}>
                <span className="badge badge--blue">{item.language.toUpperCase()}</span>
                <strong>{item.name}</strong>
                <span className="cb__chip">{item.line === 'easy_legenda' ? 'Easy Legenda' : 'Easy Casa'}</span>
                <span className="cb__chip">{item.role}</span>
                <q>{item.words || '—'}</q>
                <span className={`cb__pill${item.overdue ? ' cb__pill--late' : ''}`}>{item.deadlineLabel}</span>
              </button>
            </li>
          ))}
        </ul>
        {selected ? <DetailPane api={api} id={selected} onChanged={() => void load()} /> : <p className="muted">Select a callback.</p>}
      </div>
      <h2>Call log</h2>
      <div className="cb__scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Caller</th>
              <th>Language</th>
              <th>Line</th>
              <th>Role</th>
              <th>Length</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((row) => (
              <tr key={String(row.id)}>
                <td>{row.at ? new Date(String(row.at)).toLocaleString('it-IT') : ''}</td>
                <td>
                  {String(row.name)}
                  <br />
                  <span className="muted">{String(row.phone ?? '')}</span>
                </td>
                <td>{String(row.language)}</td>
                <td>{row.line === 'easy_legenda' ? 'Easy Legenda' : 'Easy Casa'}</td>
                <td>{String(row.role)}</td>
                <td>{String(row.durationSecs)}s</td>
                <td>{String(row.outcome)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Listen({ api, id }: { api: ReturnType<typeof useApi>; id: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  async function play() {
    setError(null);
    try {
      const blob = await api.callbacksAudio(id);
      if (src) URL.revokeObjectURL(src);
      setSrc(URL.createObjectURL(blob));
    } catch {
      setError('Playback needs the ElevenLabs API key on the server. The file is not stored here.');
    }
  }

  return (
    <div className="cb__listen">
      <button type="button" className="btn btn--sm" onClick={() => void play()}>Listen</button>
      {src ? <audio controls autoPlay src={src} /> : null}
      {error ? <p className="muted">{error}</p> : null}
    </div>
  );
}

function DetailPane({ api, id, onChanged }: { api: ReturnType<typeof useApi>; id: string; onChanged: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [slot, setSlot] = useState<string>('');
  const [override, setOverride] = useState(false);
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [people, setPeople] = useState<Array<{ id: string; name: string }>>([]);
  const [ownerId, setOwnerId] = useState('');

  async function load() {
    const row = (await api.callbacksDetail(id)) as Detail;
    setDetail(row);
    setSlot(row.suggestions[0]?.start ?? '');
  }

  useEffect(() => {
    void load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not open'));
    void api
      .callbacksTeam()
      .then((raw) => {
        const data = raw as { profiles: Array<{ id: string; name: string }> };
        setPeople(data.profiles ?? []);
      })
      .catch(() => setPeople([]));
  }, [id]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  if (!detail) return <p className="muted">{error ?? 'Loading…'}</p>;
  const chosen = override && manual ? manual : slot;
  return (
    <article className="cb__detail">
      <h2>{detail.name}</h2>
      <p>
        <span className="badge badge--blue">{detail.language.toUpperCase()}</span> {detail.lineLabel} · {detail.roleLabel}
      </p>
      {detail.phone ? (
        <a className="btn btn--sm" href={waLink(detail.phone)} target="_blank" rel="noreferrer">
          WhatsApp {detail.phone}
        </a>
      ) : null}
      <div className="cb__tiles">
        <p>
          <span className="muted">Caller asked for</span>
          <br />“{detail.words || '—'}”
        </p>
        <p>
          <span className="muted">Forwarded to</span>
          <br />
          {detail.ownerName}
          {detail.backupName ? ` · backup ${detail.backupName}` : ''}
        </p>
      </div>
      <div className="cb__slots">
        {detail.suggestions.map((s) => (
          <button key={s.start} type="button" className={`btn btn--sm${slot === s.start && !override ? ' btn--primary' : ''}`} onClick={() => { setSlot(s.start); setOverride(false); }}>
            {new Date(s.start).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}
            <br />
            <span className="muted">{s.reason}</span>
          </button>
        ))}
      </div>
      <label className="cb__other">
        Other time
        <input type="datetime-local" value={manual} onChange={(e) => { setManual(e.target.value); setOverride(true); }} />
      </label>
      {override ? <p className="muted">Manual time is confirmed only after you tick through. A taken slot is still refused.</p> : null}
      <p className="cb__preview">{detail.preview}</p>
      {error ? <p className="cb__error">{error}</p> : null}
      <div className="cb__actions">
        <button type="button" className="btn btn--primary" disabled={busy || !chosen} onClick={() => void act(() => api.callbacksConfirm(id, { slotStart: new Date(chosen).toISOString(), override }))}>
          Confirm & send
        </button>
        <label className="cb__other">
          Reassign
          <select value={ownerId} aria-label="Reassign to" onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Choose a person</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn--sm"
          disabled={busy || !ownerId}
          onClick={() => void act(() => api.callbacksAction(id, 'reassign', { ownerProfileId: ownerId }))}
        >
          Reassign
        </button>
        <button type="button" className="btn btn--sm" disabled={busy} onClick={() => void act(() => api.callbacksAction(id, 'no-answer'))}>
          No answer
        </button>
        <button type="button" className="btn btn--sm" disabled={busy} onClick={() => void act(() => api.callbacksAction(id, 'cancel'))}>
          Cancel
        </button>
      </div>
      {detail.call ? (
        <section className="cb__call">
          <h3>{detail.call.title || 'Call'}</h3>
          <p>{detail.call.summary}</p>
          <p>
            {Object.entries(detail.call.evaluations).map(([k, v]) => (
              <span key={k} className="badge badge--grey">{k}: {v || '—'}</span>
            ))}
          </p>
          {detail.canListen ? <Listen api={api} id={id} /> : null}
          {detail.call.elevenlabsUrl ? (
            <a href={detail.call.elevenlabsUrl} target="_blank" rel="noreferrer">Open the conversation in ElevenLabs</a>
          ) : (
            <p className="muted">The recording link is visible to operations and superadmin.</p>
          )}
        </section>
      ) : null}
      <ul className="cb__activity">
        {detail.events.map((e) => (
          <li key={e.id}>
            {e.action} · {new Date(e.createdAt).toLocaleString('it-IT')}
            {e.actorUserId ? ` · ${e.actorUserId}` : ''}
          </li>
        ))}
      </ul>
      <p className="muted">{detail.retention}</p>
    </article>
  );
}

function Routing({ api, canEdit }: { api: ReturnType<typeof useApi>; canEdit: boolean }) {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [people, setPeople] = useState<Array<{ id: string; name: string; languages: string[]; open: number; nextFree: string | null }>>([]);
  const [warning, setWarning] = useState(false);
  const [saved, setSaved] = useState<RouteRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.callbacksRouting().then((raw) => {
      const data = raw as { routes: RouteRow[]; people: typeof people; teamQueueWarning: boolean };
      setRoutes(data.routes);
      setSaved(data.routes);
      setPeople(data.people);
      setWarning(data.teamQueueWarning);
    }).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load routing'));
  }, [api]);

  function patch(language: string, line: RouteRow['line'], field: keyof RouteRow, value: unknown) {
    setRoutes((rows) => rows.map((r) => (r.language === language && r.line === line ? { ...r, [field]: value } : r)));
  }

  const base = routes.filter((r) => r.line == null);

  return (
    <div>
      {warning ? <p className="cb__banner">Some languages still forward to the Team queue. Name the people when AZM has them.</p> : null}
      {error ? <p className="cb__error">{error}</p> : null}
      <ul className="cb__people">
        {people.map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong>
            <span>{p.languages.join(', ') || '—'}</span>
            <span>{p.open} open</span>
            <span>{p.nextFree ? new Date(p.nextFree).toLocaleString('it-IT', { timeZone: 'Europe/Rome' }) : 'no free slot'}</span>
          </li>
        ))}
      </ul>
      <div className="cb__langgrid">
        {LANGS.map((language) => {
          const row = base.find((r) => r.language === language);
          const legenda = routes.find((r) => r.language === language && r.line === 'easy_legenda');
          if (!row) return null;
          return (
            <article key={language} className="cb__lang">
              <h3><span className="badge badge--blue">{language.toUpperCase()}</span></h3>
              <label>
                Forward to
                <select disabled={!canEdit} value={row.forwardProfileId} onChange={(e) => patch(language, null, 'forwardProfileId', e.target.value)}>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label>
                Backup
                <select disabled={!canEdit} value={row.backupProfileId ?? ''} onChange={(e) => patch(language, null, 'backupProfileId', e.target.value || null)}>
                  <option value="">None</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label>
                Confirm within
                <select disabled={!canEdit} value={row.confirmWithin} onChange={(e) => patch(language, null, 'confirmWithin', e.target.value)}>
                  <option value="2h">2 working hours</option>
                  <option value="4h">4 working hours</option>
                  <option value="1d">1 working day</option>
                </select>
              </label>
              <label className="cb__toggle"><input type="checkbox" disabled={!canEdit} checked={row.alertWhatsapp} onChange={(e) => patch(language, null, 'alertWhatsapp', e.target.checked)} /> WhatsApp alert</label>
              <label className="cb__toggle"><input type="checkbox" disabled={!canEdit} checked={row.alertEmail} onChange={(e) => patch(language, null, 'alertEmail', e.target.checked)} /> Email alert</label>
              <label className="cb__toggle"><input type="checkbox" disabled checked={false} /> Offer real slots · Phase B</label>
              <label className="cb__toggle">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={Boolean(legenda)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setRoutes((rows) => [...rows, { ...row, id: '', line: 'easy_legenda', forwardProfileId: row.forwardProfileId, backupProfileId: row.backupProfileId }]);
                    } else {
                      setRoutes((rows) => rows.filter((r) => !(r.language === language && r.line === 'easy_legenda')));
                    }
                  }}
                />
                Different person for Easy Legenda
              </label>
              {legenda ? (
                <label>
                  Easy Legenda forward to
                  <select disabled={!canEdit} value={legenda.forwardProfileId} onChange={(e) => patch(language, 'easy_legenda', 'forwardProfileId', e.target.value)}>
                    {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
              ) : null}
            </article>
          );
        })}
      </div>
      {canEdit ? (
        <div className="cb__actions">
          <button type="button" className="btn btn--primary" onClick={() => void api.callbacksSaveRouting({ routes }).then(() => setSaved(routes)).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Save failed'))}>
            Save
          </button>
          <button type="button" className="btn btn--sm" onClick={() => setRoutes(saved)}>Discard</button>
        </div>
      ) : <p className="muted">Routing edits are for operations.</p>}
    </div>
  );
}

function covers(ranges: Profile['weekly'], weekday: number, hour: number): boolean {
  const min = hour * 60;
  return ranges.some((r) => r.weekday === weekday && min >= r.startMin && min < r.endMin);
}

function toggleHour(ranges: Profile['weekly'], weekday: number, hour: number): Profile['weekly'] {
  const min = hour * 60;
  const next: Profile['weekly'] = [];
  let removed = false;
  for (const r of ranges) {
    if (r.weekday !== weekday || min < r.startMin || min >= r.endMin) {
      next.push(r);
      continue;
    }
    removed = true;
    if (min > r.startMin) next.push({ ...r, endMin: min });
    if (min + 60 < r.endMin) next.push({ ...r, startMin: min + 60 });
  }
  if (!removed) next.push({ weekday, startMin: min, endMin: min + 60 });
  return next;
}

function Team({ api, canEdit }: { api: ReturnType<typeof useApi>; canEdit: boolean }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [bookings, setBookings] = useState<Array<{ profileId: string; start: string }>>([]);
  const [active, setActive] = useState<string | null>(null);
  const [staff, setStaff] = useState<Array<{ id: string; displayName: string; email: string | null }>>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = (await api.callbacksTeam()) as { profiles: Profile[]; bookings: Array<{ profileId: string; start: string }> };
    setProfiles(data.profiles);
    setBookings(data.bookings);
    setActive((cur) => cur ?? data.profiles[0]?.id ?? null);
  }

  useEffect(() => {
    void load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load team'));
    void api.callbacksStaff('').then((rows) => setStaff(rows as typeof staff)).catch(() => setStaff([]));
  }, [api]);

  const profile = profiles.find((p) => p.id === active) ?? null;

  function update(patch: Partial<Profile>) {
    if (!profile) return;
    setProfiles((rows) => rows.map((p) => (p.id === profile.id ? { ...p, ...patch } : p)));
  }

  return (
    <div className="cb__split">
      <div>
        {error ? <p className="cb__error">{error}</p> : null}
        <ul className="cb__queue">
          {profiles.map((p) => (
            <li key={p.id}>
              <button type="button" className={`cb__row${active === p.id ? ' cb__row--on' : ''}`} onClick={() => setActive(p.id)}>
                <strong>{p.name}</strong>
                <span className="muted">{p.kind === 'team_queue' ? 'Team queue' : p.languages.join(', ')}</span>
              </button>
            </li>
          ))}
        </ul>
        {canEdit ? (
          <form
            className="cb__add"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const adminUserId = String(data.get('adminUserId') || '');
              const person = staff.find((s) => s.id === adminUserId);
              const row: Profile = {
                id: '',
                kind: 'person',
                adminUserId: adminUserId || null,
                name: person?.displayName || 'Team member',
                email: person?.email || '',
                whatsappE164: null,
                languages: ['it'],
                callbackMin: 20,
                gapMin: 10,
                maxPerDay: 8,
                earliestMin: 120,
                weekly: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMin: 9 * 60, endMin: 18 * 60 })),
                timeOff: [],
              };
              void api.callbacksSaveTeam(row).then(() => load());
            }}
          >
            <label>
              Add a team member
              <select name="adminUserId" required>
                <option value="">Choose an admin user</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
              </select>
            </label>
            <button type="submit" className="btn btn--sm">Add</button>
          </form>
        ) : null}
      </div>
      {profile ? (
        <article className="cb__detail">
          <h2>{profile.name}</h2>
          <label>WhatsApp<input disabled={!canEdit || profile.kind === 'team_queue'} value={profile.whatsappE164 ?? ''} onChange={(e) => update({ whatsappE164: e.target.value || null })} /></label>
          <label>Email<input disabled={!canEdit} value={profile.email} onChange={(e) => update({ email: e.target.value })} /></label>
          <label>Languages<input disabled={!canEdit} value={profile.languages.join(', ')} onChange={(e) => update({ languages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></label>
          <div className="cb__nums">
            <label>Length min<input disabled={!canEdit} type="number" value={profile.callbackMin} onChange={(e) => update({ callbackMin: Number(e.target.value) })} /></label>
            <label>Gap min<input disabled={!canEdit} type="number" value={profile.gapMin} onChange={(e) => update({ gapMin: Number(e.target.value) })} /></label>
            <label>Max / day<input disabled={!canEdit || profile.kind === 'team_queue'} type="number" value={profile.maxPerDay ?? ''} onChange={(e) => update({ maxPerDay: e.target.value === '' ? null : Number(e.target.value) })} /></label>
            <label>Earliest min<input disabled={!canEdit} type="number" value={profile.earliestMin} onChange={(e) => update({ earliestMin: Number(e.target.value) })} /></label>
          </div>
          <div className="cb__scroll">
            <table className="table cb__grid">
              <thead>
                <tr>
                  <th />
                  {DAYS.map((d) => <th key={d.n}>{d.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour}>
                    <th>{String(hour).padStart(2, '0')}:00</th>
                    {DAYS.map((d) => {
                      const booked = bookings.some((b) => {
                        if (b.profileId !== profile.id) return false;
                        const hourRome = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(new Date(b.start));
                        return Number(hourRome) === hour;
                      });
                      const on = covers(profile.weekly, d.n, hour);
                      return (
                        <td key={d.n}>
                          <button
                            type="button"
                            disabled={!canEdit || booked}
                            className={`cb__cell${on ? ' cb__cell--on' : ''}${booked ? ' cb__cell--booked' : ''}`}
                            onClick={() => update({ weekly: toggleHour(profile.weekly, d.n, hour) })}
                          >
                            {booked ? 'B' : on ? '·' : ''}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label>
            Time off start
            <input disabled={!canEdit} type="date" onChange={(e) => update({ timeOff: [...profile.timeOff, { startDate: e.target.value, endDate: e.target.value, weekdays: null }] })} />
          </label>
          <ul>
            {profile.timeOff.map((off, i) => (
              <li key={`${off.startDate}-${i}`}>{off.startDate} → {off.endDate} · callbacks go to the backup</li>
            ))}
          </ul>
          {canEdit ? (
            <button type="button" className="btn btn--primary" onClick={() => void api.callbacksSaveTeam(profile).then(() => load())}>
              Save availability
            </button>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}
