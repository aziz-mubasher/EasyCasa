/**
 * EC-31 — pure formatting for aste-eval paste tables (G1 operator hit/miss).
 * Unwraps nested {value|importo, source} money objects so eval output never prints [object Object].
 */

export type ScoredField = {
  hit: boolean;
  value: string;
  page: string;
  notes: string;
};

type SourceRef = { page?: unknown; file?: unknown } | null | undefined;

function sourcePage(source: SourceRef): string {
  return source?.page == null ? '' : String(source.page);
}

function sourceDoc(source: SourceRef): string {
  return source?.file == null ? '' : String(source.file);
}

/** Unwrap a sourced money/scalar field ({ value, source } or { importo, source }). */
export function unwrapSourcedValue(v: unknown): ScoredField {
  if (v == null) {
    return { hit: false, value: '', page: '', notes: '' };
  }
  if (typeof v !== 'object') {
    return { hit: true, value: String(v), page: '', notes: '' };
  }

  const o = v as Record<string, unknown>;
  const source = o.source as SourceRef;
  const page = sourcePage(source);
  const doc = sourceDoc(source);
  const derived = o.derived === true;

  if ('value' in o || 'importo' in o) {
    const amount = 'value' in o ? o.value : o.importo;
    if (amount == null) {
      return { hit: false, value: '', page, notes: doc };
    }
    let valueStr = String(amount);
    if (derived) valueStr = `${valueStr} (derived)`;
    return { hit: true, value: valueStr, page, notes: doc };
  }

  return { hit: false, value: '', page, notes: doc };
}

/** Cauzione object: importo and/or pct with optional derived importo (EC-30 shape). */
export function scoreCauzioneField(c: unknown): ScoredField {
  if (c == null || typeof c !== 'object') {
    return { hit: false, value: '', page: '', notes: '' };
  }
  const o = c as {
    importo?: number | null;
    pct?: number | null;
    derived?: boolean;
    source?: SourceRef;
  };
  const page = sourcePage(o.source);
  const doc = sourceDoc(o.source);
  const hit = o.importo != null || o.pct != null;
  const parts: string[] = [];
  if (o.importo != null) {
    parts.push(o.derived ? `${o.importo} (derived)` : String(o.importo));
  }
  if (o.pct != null) {
    parts.push(`${o.pct}%`);
  }
  return { hit, value: parts.join(' / '), page, notes: doc };
}

function applyNotFound(fieldPath: string, scored: ScoredField, notFound: Set<string>): ScoredField {
  if (!notFound.has(fieldPath)) return scored;
  return {
    hit: false,
    value: '',
    page: scored.page,
    notes: scored.notes ? `${scored.notes}; not_found` : 'not_found',
  };
}

function formatRow(field: string, scored: ScoredField, extraNotes = ''): string {
  const notes = [scored.notes, extraNotes].filter(Boolean).join('; ');
  return `${field}\t${scored.hit ? 'hit' : 'miss'}\t${scored.value}\t${scored.page}\t${notes}`;
}

/** Render paste-ready TSV lines for an extraction payload (no I/O). */
export function renderExtractionScoreTable(extraction: Record<string, unknown>): string[] {
  const economics = (extraction.economics ?? {}) as Record<string, unknown>;
  const procedura = (extraction.procedura ?? {}) as Record<string, unknown>;
  const giuridica = (extraction.giuridica ?? {}) as {
    stato_occupazione?: { stato?: string | null; dettaglio?: string | null };
  };
  const urbanistica = (extraction.urbanistica ?? {}) as {
    conformita_urbanistica?: { stato?: string | null; dettaglio?: string | null };
    conformita_catastale?: { stato?: string | null; dettaglio?: string | null };
    difformita?: unknown[];
  };
  const meta = (extraction.meta ?? {}) as {
    not_found?: string[];
    warnings?: string[];
    lotti_trovati?: string[];
    lotto?: { label?: string | null } | null;
  };

  const notFound = new Set(meta.not_found ?? []);
  const lines: string[] = ['field\thit\tvalue\tpage\tnotes'];

  const econRows: Array<[string, ScoredField, string]> = [
    [
      'economics.valore_stima',
      applyNotFound('economics.valore_stima', unwrapSourcedValue(economics.valore_stima), notFound),
      '',
    ],
    [
      'economics.prezzo_base',
      applyNotFound('economics.prezzo_base', unwrapSourcedValue(economics.prezzo_base), notFound),
      'Ex2: avviso not ordinanza',
    ],
    [
      'economics.offerta_minima',
      applyNotFound('economics.offerta_minima', unwrapSourcedValue(economics.offerta_minima), notFound),
      '',
    ],
    [
      'economics.cauzione',
      applyNotFound('economics.cauzione', scoreCauzioneField(economics.cauzione), notFound),
      '',
    ],
    [
      'economics.rilancio_minimo',
      applyNotFound('economics.rilancio_minimo', unwrapSourcedValue(economics.rilancio_minimo), notFound),
      '',
    ],
  ];

  for (const [field, scored, extraNotes] of econRows) {
    lines.push(formatRow(field, scored, extraNotes));
  }

  const procRows: Array<[string, unknown]> = [
    ['procedura.tipo', procedura.tipo],
    ['procedura.numero', procedura.numero],
    ['procedura.tribunale', procedura.tribunale],
  ];
  for (const [field, raw] of procRows) {
    lines.push(formatRow(field, unwrapSourcedValue(raw)));
  }

  const occ = giuridica.stato_occupazione;
  const occStatus = occ?.stato?.trim() || '';
  const occDet = occ?.dettaglio?.trim() || '';
  const occHit = Boolean(occStatus) && !notFound.has('giuridica.stato_occupazione');
  lines.push(
    `giuridica.stato_occupazione\t${occHit ? 'hit' : 'miss'}\t${[occStatus, occDet].filter(Boolean).join(' — ')}\t\t${notFound.has('giuridica.stato_occupazione') ? 'not_found' : ''}`,
  );

  const cu = urbanistica.conformita_urbanistica?.stato?.trim() || '';
  const cc = urbanistica.conformita_catastale?.stato?.trim() || '';
  const difn = Array.isArray(urbanistica.difformita) ? urbanistica.difformita.length : 0;
  const lottoLabel = (
    (meta as { lotto?: { label?: string | null } | null }).lotto?.label ??
    (procedura.lotto as string | null | undefined) ??
    ''
  )
    .trim()
    .toUpperCase();
  const conformitaNotes =
    lottoLabel === 'H' ? 'GT-5: lotto H must NOT be marked non-conform' : '';
  lines.push(
    `urbanistica.conformita\t${cu || cc ? 'hit' : 'miss'}\turb=${cu}|cat=${cc}|difformita=${difn}\t\t${conformitaNotes}`,
  );

  lines.push(`meta.lotti_trovati\thit\t${(meta.lotti_trovati ?? []).join('|')}\t\t`);

  const nfList = meta.not_found ?? [];
  lines.push(
    `meta.not_found\t-\t${nfList.length ? nfList.join(',') : '(none)'}\t\tmisses must land here — no invented values`,
  );

  if (meta.warnings?.length) {
    lines.push(`meta.warnings\t-\t${meta.warnings.join(' | ')}\t\t`);
  }

  return lines;
}

export function printExtractionScoreTable(extraction: Record<string, unknown>): void {
  for (const line of renderExtractionScoreTable(extraction)) {
    console.log(line);
  }
}
