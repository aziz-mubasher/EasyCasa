import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ANALYTICS_CHANNELS, addDays, buildCampaignUrl, romeDay, utmConventionError } from '@easycasa/shared';

import { useApi } from '../api';

type Lang = 'it' | 'en';
type Totals = {
  visitors: number;
  sessions: number;
  pageviews: number;
  engagedRate: number | null;
  avgEngagedMs: number | null;
  conversions: number;
  conversionRate: number | null;
};
type Overview = {
  totals: Totals;
  previous: Totals | null;
  daily: Array<{ day: string; visitors: number; pageviews: number; conversions: number }>;
};
type SourceRow = {
  channel: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  sessions: number;
  visitors: number;
  engagedRate: number | null;
  conversions: number;
  conversionRate: number | null;
  spendEur: number | null;
  cpl: number | null;
};
type PageRow = {
  pathTemplate: string;
  locale: string | null;
  pageviews: number;
  visitors: number;
  entries: number;
  engagedMsSum: number;
  engagedSamples: number;
};

const COPY = {
  it: {
    title: 'Analytics',
    live: 'In questo momento',
    range: 'Periodo',
    compare: 'Confronto',
    locale: 'Lingua',
    channel: 'Canale',
    none: 'Nessuno',
    prev: 'Periodo precedente',
    yoy: 'Anno prima',
    all: 'Tutte',
    custom: 'Date',
    visitors: 'Visitatori',
    visits: 'Visite',
    pages: 'Pagine viste',
    engaged: 'Visite coinvolte',
    time: 'Tempo coinvolto medio',
    conversions: 'Conversioni',
    cr: 'Tasso di conversione',
    trend: 'Andamento',
    sources: 'Canali / sorgenti',
    pageTable: 'Pagine',
    listings: 'Annunci più visti',
    provinces: 'Province',
    funnels: 'Funnel',
    dims: 'Dispositivi, browser, paese, lingua, referrer',
    convTable: 'Conversioni',
    client: 'Dal browser',
    server: 'Dal server',
    gap: 'Scarto',
    spend: 'Spesa campagna',
    spendNote: 'La spesa è mensile. Un mese parzialmente nel periodo entra per intero nel CPL.',
    save: 'Salva spesa',
    builder: 'Costruttore di link',
    copy: 'Copia',
    copied: 'Copiato',
    export: 'CSV',
    empty: 'Nessun dato nel periodo.',
    footer:
      'Dati aggregati, senza cookie. Utenti unici calcolati per giorno; nessun percorso tra giorni diversi. Attribuzione: prima sorgente della sessione, stesso giorno. Il funnel usa il canale della prima sessione del giorno.',
    campaign: 'Campagna',
    month: 'Mese (primo giorno)',
    amount: 'Euro',
    note: 'Nota',
    source: 'Sorgente',
    medium: 'Mezzo',
    content: 'Contenuto',
    base: 'URL di partenza',
  },
  en: {
    title: 'Analytics',
    live: 'Live now',
    range: 'Range',
    compare: 'Compare',
    locale: 'Language',
    channel: 'Channel',
    none: 'None',
    prev: 'Previous period',
    yoy: 'Year before',
    all: 'All',
    custom: 'Dates',
    visitors: 'Visitors',
    visits: 'Visits',
    pages: 'Pageviews',
    engaged: 'Engaged visits',
    time: 'Mean engaged time',
    conversions: 'Conversions',
    cr: 'Conversion rate',
    trend: 'Trend',
    sources: 'Channels / sources',
    pageTable: 'Pages',
    listings: 'Most viewed listings',
    provinces: 'Provinces',
    funnels: 'Funnels',
    dims: 'Device, browser, country, language, referrer',
    convTable: 'Conversions',
    client: 'Browser',
    server: 'Server',
    gap: 'Gap',
    spend: 'Campaign spend',
    spendNote: 'Spend is monthly. A month that only partly overlaps the range is counted in full for CPL.',
    save: 'Save spend',
    builder: 'Link builder',
    copy: 'Copy',
    copied: 'Copied',
    export: 'CSV',
    empty: 'No rows in this range.',
    footer:
      'Aggregated, cookieless. Unique visitors are per day; there is no path across days. Attribution: first source of the session, same day. Funnels use the channel of the first session that day.',
    campaign: 'Campaign',
    month: 'Month (first day)',
    amount: 'Euro',
    note: 'Note',
    source: 'Source',
    medium: 'Medium',
    content: 'Content',
    base: 'Base URL',
  },
} as const;

function pct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value * 1000) / 10}%`;
}

function ms(value: number | null | undefined): string {
  if (value == null) return '—';
  const sec = Math.round(value / 1000);
  return `${sec}s`;
}

function delta(current: number, previous: number | null | undefined): string {
  if (previous == null) return '';
  const diff = current - previous;
  const sign = diff > 0 ? '+' : '';
  return ` ${sign}${diff}`;
}

function qs(input: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

function Trend({ daily }: { daily: Overview['daily'] }) {
  if (daily.length === 0) return null;
  const width = 640;
  const height = 160;
  const max = Math.max(1, ...daily.map((d) => Math.max(d.visitors, d.conversions)));
  const x = (i: number) => (daily.length === 1 ? width / 2 : (i / (daily.length - 1)) * width);
  const y = (n: number) => height - (n / max) * (height - 8) - 4;
  const line = (key: 'visitors' | 'conversions') =>
    daily.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="160" role="img">
      <path d={line('visitors')} fill="none" stroke="currentColor" strokeWidth="2" />
      <path d={line('conversions')} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" opacity="0.6" />
    </svg>
  );
}

function Sortable<T extends Record<string, unknown>>({
  rows,
  columns,
  onExport,
  exportLabel,
}: {
  rows: T[];
  columns: Array<{ key: keyof T; label: string }>;
  onExport?: () => void;
  exportLabel: string;
}) {
  const [sort, setSort] = useState<{ key: keyof T; dir: 1 | -1 } | null>(null);
  const ordered = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sort.dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * sort.dir;
    });
  }, [rows, sort]);
  return (
    <div>
      {onExport ? (
        <button type="button" className="btn" onClick={onExport}>
          {exportLabel}
        </button>
      ) : null}
      {ordered.length === 0 ? <p className="muted">—</p> : null}
      {ordered.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      setSort((prev) =>
                        prev?.key === col.key ? { key: col.key, dir: prev.dir === 1 ? -1 : 1 } : { key: col.key, dir: -1 },
                      )
                    }
                  >
                    {col.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((row, index) => (
              <tr key={index}>
                {columns.map((col) => (
                  <td key={String(col.key)} className="mono">
                    {row[col.key] == null ? '—' : String(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

export function Analytics() {
  const api = useApi();
  const qc = useQueryClient();
  const [lang, setLang] = useState<Lang>('it');
  const t = COPY[lang];
  const today = romeDay();
  const [preset, setPreset] = useState<'7' | '28' | '90' | 'custom'>('28');
  const [from, setFrom] = useState(addDays(today, -27));
  const [to, setTo] = useState(today);
  const [compare, setCompare] = useState<'none' | 'prev' | 'yoy'>('prev');
  const [locale, setLocale] = useState('');
  const [channel, setChannel] = useState('');
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState({
    base: 'https://easycasaita.com/it/vendi-da-privato',
    source: 'google',
    medium: 'cpc',
    campaign: 'ec_seller_bs_fascicolo_202611',
    content: 'v4_film_30s',
  });
  const [spend, setSpend] = useState({ utmCampaign: '', month: `${today.slice(0, 7)}-01`, spendEur: '', note: '' });

  const range = useMemo(() => {
    if (preset === '7') return { from: addDays(today, -6), to: today };
    if (preset === '28') return { from: addDays(today, -27), to: today };
    if (preset === '90') return { from: addDays(today, -89), to: today };
    return { from, to };
  }, [preset, today, from, to]);

  const query = qs({ ...range, compare, locale: locale || undefined, channel: channel || undefined });
  const overview = useQuery({
    queryKey: ['analytics', 'overview', query],
    queryFn: () => api.analyticsOverview(query) as Promise<Overview>,
  });
  const live = useQuery({
    queryKey: ['analytics', 'live'],
    queryFn: () => api.analyticsRealtime(),
    refetchInterval: 30_000,
  });
  const sources = useQuery({
    queryKey: ['analytics', 'sources', query],
    queryFn: () => api.analyticsSources(query) as Promise<{ rows: SourceRow[]; spend: Array<{ utmCampaign: string; month: string; spendEur: number; note: string | null }> }>,
  });
  const pages = useQuery({
    queryKey: ['analytics', 'pages', query],
    queryFn: () => api.analyticsPages(query) as Promise<{ rows: PageRow[] }>,
  });
  const listings = useQuery({
    queryKey: ['analytics', 'listings', query],
    queryFn: () =>
      api.analyticsListings(query) as Promise<{
        rows: Array<{ listingId: string; title: string | null; comune: string | null; provincia: string | null; pageviews: number }>;
      }>,
  });
  const provinces = useQuery({
    queryKey: ['analytics', 'provinces', range.from, range.to],
    queryFn: () =>
      api.analyticsProvinces(qs(range)) as Promise<{ rows: Array<{ province: string; listingViews: number; enquiries: number }> }>,
  });
  const conversions = useQuery({
    queryKey: ['analytics', 'conversions', query],
    queryFn: () =>
      api.analyticsConversions(query) as Promise<{ rows: Array<{ eventName: string; client: number; server: number; gap: number | null }> }>,
  });
  const funnels = useQuery({
    queryKey: ['analytics', 'funnels', query],
    queryFn: async () => {
      const ids = ['seller', 'buyer', 'legenda', 'contact'] as const;
      return Promise.all(
        ids.map(async (id) => ({
          id,
          ...(await (api.analyticsFunnel(id, query) as Promise<{ steps: Array<{ step: number; label: string; visitors: number; dropOff: number | null }> }>)),
        })),
      );
    },
  });
  const dims = useQuery({
    queryKey: ['analytics', 'dims', range.from, range.to],
    queryFn: async () => {
      const names = ['device', 'browser', 'country', 'locale', 'referrer'] as const;
      const blocks = await Promise.all(
        names.map(async (dim) => ({
          dim,
          ...(await (api.analyticsDimensions(dim, qs(range)) as Promise<{ rows: Array<{ value: string; visitors: number; sessions: number }> }>)),
        })),
      );
      return blocks;
    },
  });

  const saveSpend = useMutation({
    mutationFn: () =>
      api.analyticsSpend({
        utmCampaign: spend.utmCampaign,
        month: spend.month,
        spendEur: Number(spend.spendEur),
        note: spend.note || undefined,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['analytics'] }),
  });

  async function download(table: string) {
    const csv = await api.analyticsExportCsv(qs({ ...range, locale: locale || undefined, channel: channel || undefined, table }));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${table}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = overview.data?.totals;
  const previous = overview.data?.previous;
  const built = buildCampaignUrl(link);
  const linkError = utmConventionError(link);
  const seenCampaign = new Set<string>();
  const sourceRows = (sources.data?.rows ?? []).map((row) => {
    const campaign = row.utmCampaign ?? '';
    const showSpend = campaign && !seenCampaign.has(campaign);
    if (campaign) seenCampaign.add(campaign);
    return {
      ...row,
      engaged: pct(row.engagedRate),
      cr: pct(row.conversionRate),
      spendEur: showSpend ? row.spendEur : null,
      cpl: showSpend ? row.cpl : null,
    };
  });

  const tiles: Array<{ label: string; value: string; extra: string }> = totals
    ? [
        { label: t.visitors, value: String(totals.visitors), extra: delta(totals.visitors, previous?.visitors) },
        { label: t.visits, value: String(totals.sessions), extra: delta(totals.sessions, previous?.sessions) },
        { label: t.pages, value: String(totals.pageviews), extra: delta(totals.pageviews, previous?.pageviews) },
        { label: t.engaged, value: pct(totals.engagedRate), extra: '' },
        { label: t.time, value: ms(totals.avgEngagedMs), extra: '' },
        { label: t.conversions, value: String(totals.conversions), extra: delta(totals.conversions, previous?.conversions) },
        { label: t.cr, value: pct(totals.conversionRate), extra: '' },
      ]
    : [];

  return (
    <section>
      <header style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <h1>{t.title}</h1>
        <button type="button" className="btn" onClick={() => setLang(lang === 'it' ? 'en' : 'it')}>
          {lang === 'it' ? 'EN' : 'IT'}
        </button>
        <p className="mono">
          {t.live}: {live.data?.live ?? '—'}
        </p>
      </header>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '1rem 0' }}>
        <label>
          {t.range}{' '}
          <select value={preset} onChange={(e) => setPreset(e.target.value as typeof preset)}>
            <option value="7">7</option>
            <option value="28">28</option>
            <option value="90">90</option>
            <option value="custom">{t.custom}</option>
          </select>
        </label>
        {preset === 'custom' ? (
          <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        ) : null}
        <label>
          {t.compare}{' '}
          <select value={compare} onChange={(e) => setCompare(e.target.value as typeof compare)}>
            <option value="none">{t.none}</option>
            <option value="prev">{t.prev}</option>
            <option value="yoy">{t.yoy}</option>
          </select>
        </label>
        <label>
          {t.locale}{' '}
          <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="">{t.all}</option>
            <option value="it">it</option>
            <option value="en">en</option>
            <option value="es">es</option>
          </select>
        </label>
        <label>
          {t.channel}{' '}
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">{t.all}</option>
            {ANALYTICS_CHANNELS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {overview.isError ? <p className="error">Analytics API unavailable.</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
        {tiles.map((tile) => (
          <div key={tile.label}>
            <p className="muted">{tile.label}</p>
            <p className="mono">
              {tile.value}
              {tile.extra}
            </p>
          </div>
        ))}
      </div>
      <h2>{t.trend}</h2>
      <Trend daily={overview.data?.daily ?? []} />
      <h2>{t.sources}</h2>
      <Sortable
        exportLabel={t.export}
        onExport={() => void download('sources')}
        rows={sourceRows}
        columns={[
          { key: 'channel', label: t.channel },
          { key: 'utmSource', label: t.source },
          { key: 'utmMedium', label: t.medium },
          { key: 'utmCampaign', label: t.campaign },
          { key: 'sessions', label: t.visits },
          { key: 'engaged', label: t.engaged },
          { key: 'conversions', label: t.conversions },
          { key: 'cr', label: t.cr },
          { key: 'spendEur', label: t.amount },
          { key: 'cpl', label: 'CPL' },
        ]}
      />
      <h2>{t.pageTable}</h2>
      <Sortable
        exportLabel={t.export}
        onExport={() => void download('pages')}
        rows={(pages.data?.rows ?? []).map((row) => ({
          ...row,
          engaged: row.engagedSamples ? ms(row.engagedMsSum / row.engagedSamples) : '—',
        }))}
        columns={[
          { key: 'pathTemplate', label: 'Path' },
          { key: 'locale', label: t.locale },
          { key: 'pageviews', label: t.pages },
          { key: 'visitors', label: t.visitors },
          { key: 'entries', label: 'Entries' },
          { key: 'engaged', label: t.time },
        ]}
      />
      <h2>{t.listings}</h2>
      <Sortable
        exportLabel={t.export}
        onExport={() => void download('listings')}
        rows={listings.data?.rows ?? []}
        columns={[
          { key: 'listingId', label: 'ID' },
          { key: 'title', label: 'Title' },
          { key: 'comune', label: 'Comune' },
          { key: 'provincia', label: 'Provincia' },
          { key: 'pageviews', label: t.pages },
        ]}
      />
      <h2>{t.provinces}</h2>
      <Sortable
        exportLabel={t.export}
        onExport={() => void download('provinces')}
        rows={provinces.data?.rows ?? []}
        columns={[
          { key: 'province', label: 'Provincia' },
          { key: 'listingViews', label: t.pages },
          { key: 'enquiries', label: t.conversions },
        ]}
      />
      <h2>{t.funnels}</h2>
      <button type="button" className="btn" onClick={() => void download('funnels')}>
        {t.export}
      </button>
      {(funnels.data ?? []).map((funnel) => (
        <div key={funnel.id}>
          <h3>{funnel.id}</h3>
          {(funnel.steps ?? []).map((step) => (
            <p key={step.step} className="mono">
              {step.step}. {step.label} — {step.visitors}
              {step.dropOff != null ? ` · −${pct(step.dropOff)}` : ''}
            </p>
          ))}
        </div>
      ))}
      <h2>{t.dims}</h2>
      {(dims.data ?? []).map((block) => (
        <div key={block.dim}>
          <h3>{block.dim}</h3>
          <Sortable
            exportLabel={t.export}
            onExport={() => void download(block.dim)}
            rows={block.rows ?? []}
            columns={[
              { key: 'value', label: block.dim },
              { key: 'visitors', label: t.visitors },
              { key: 'sessions', label: t.visits },
            ]}
          />
        </div>
      ))}
      <h2>{t.convTable}</h2>
      <Sortable
        exportLabel={t.export}
        onExport={() => void download('conversions')}
        rows={(conversions.data?.rows ?? []).map((row) => ({ ...row, gap: pct(row.gap) }))}
        columns={[
          { key: 'eventName', label: 'Event' },
          { key: 'client', label: t.client },
          { key: 'server', label: t.server },
          { key: 'gap', label: t.gap },
        ]}
      />
      <h2>{t.spend}</h2>
      <p className="muted">{t.spendNote}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveSpend.mutate();
        }}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
      >
        <input placeholder={t.campaign} value={spend.utmCampaign} onChange={(e) => setSpend({ ...spend, utmCampaign: e.target.value })} />
        <input placeholder={t.month} value={spend.month} onChange={(e) => setSpend({ ...spend, month: e.target.value })} />
        <input placeholder={t.amount} value={spend.spendEur} onChange={(e) => setSpend({ ...spend, spendEur: e.target.value })} />
        <input placeholder={t.note} value={spend.note} onChange={(e) => setSpend({ ...spend, note: e.target.value })} />
        <button type="submit" className="btn btn--primary" disabled={saveSpend.isPending}>
          {t.save}
        </button>
      </form>
      {saveSpend.isError ? <p className="error">Spend rejected.</p> : null}
      <h2>{t.builder}</h2>
      <div style={{ display: 'grid', gap: '0.4rem', maxWidth: 520 }}>
        {(['base', 'source', 'medium', 'campaign', 'content'] as const).map((field) => (
          <label key={field}>
            {t[field === 'base' ? 'base' : field === 'source' ? 'source' : field === 'medium' ? 'medium' : field === 'campaign' ? 'campaign' : 'content']}{' '}
            <input value={link[field]} onChange={(e) => setLink({ ...link, [field]: e.target.value })} />
          </label>
        ))}
        <p className="mono">{built ?? linkError}</p>
        <button
          type="button"
          className="btn"
          disabled={!built}
          onClick={() => {
            if (!built) return;
            void navigator.clipboard.writeText(built).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? t.copied : t.copy}
        </button>
      </div>
      <p className="muted" style={{ marginTop: '2rem' }}>
        {COPY.it.footer}
      </p>
      {lang === 'en' ? <p className="muted">{t.footer}</p> : null}
    </section>
  );
}
