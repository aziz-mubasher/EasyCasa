import { propertyTypeFromOmiCodTip, normalizeOmiStato } from './map-cod-tip';
import { normalizeOmiComune } from './normalize-comune';

export interface ParsedOmiValoriRow {
  provincia: string;
  comune: string;
  omiZone: string;
  linkZona: string;
  codTip: number;
  descrTipologia: string;
  stato: string;
  rectified: boolean;
  minPerM2Cents: number;
  maxPerM2Cents: number;
  propertyType: string;
}

export interface ParseOmiValoriResult {
  rows: ParsedOmiValoriRow[];
  skipped: { reason: string; count: number }[];
  headerLine: number;
}

const BANNER_MARKERS = ['Quotazioni', 'OMI', 'Agenzia'];

function pickField(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const direct = row[key];
    if (direct != null && direct.trim() !== '') return direct.trim();
    const lower = key.toLowerCase();
    for (const [k, v] of Object.entries(row)) {
      if (k.toLowerCase() === lower && v.trim() !== '') return v.trim();
    }
  }
  return '';
}

function parseEuroToCents(raw: string): { cents: number; rectified: boolean } | null {
  let s = raw.trim();
  if (!s) return null;
  const rectified = s.endsWith('*');
  if (rectified) s = s.slice(0, -1).trim();
  s = s.replace(/\./g, '').replace(',', '.');
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return { cents: Math.round(n * 100), rectified };
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out;
}

function detectDelimiter(line: string): string {
  const semi = (line.match(/;/g) ?? []).length;
  const comma = (line.match(/,/g) ?? []).length;
  return semi > comma ? ';' : ',';
}

function rowToRecord(headers: string[], cells: string[]): Record<string, string> {
  const rec: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    rec[headers[i]!] = (cells[i] ?? '').trim();
  }
  return rec;
}

function isBannerLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (!t.includes('Prov') && BANNER_MARKERS.some((m) => t.includes(m))) return true;
  return false;
}

/**
 * Parse OMI "Valori" CSV (Forniture dati OMI / ondata-normalized valori.csv).
 * Skips AE banner rows and rows without positive compravendita min/max.
 */
export function parseOmiValoriCsv(text: string): ParseOmiValoriResult {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const skippedMap = new Map<string, number>();
  const bump = (reason: string) => skippedMap.set(reason, (skippedMap.get(reason) ?? 0) + 1);

  let headerIdx = -1;
  let delimiter = ',';
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim() || isBannerLine(line)) continue;
    delimiter = detectDelimiter(line);
    const cells = splitCsvLine(line, delimiter);
    const joined = cells.join('|').toLowerCase();
    if (joined.includes('compr_min') || joined.includes('comprav') || joined.includes('cod_tip')) {
      headerIdx = i;
      headers = cells.map((h) => h.trim());
      break;
    }
  }

  if (headerIdx < 0) {
    return { rows: [], skipped: [{ reason: 'missing_header', count: lines.length }], headerLine: -1 };
  }

  const rows: ParsedOmiValoriRow[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    const cells = splitCsvLine(line, delimiter);
    const rec = rowToRecord(headers, cells);

    const provincia = pickField(rec, 'Prov', 'Provincia', 'PROV').toUpperCase();
    const comuneRaw = pickField(rec, 'Comune_descrizione', 'Comune_descr', 'Comune', 'COMUNE_DESCRIZIONE');
    const comune = normalizeOmiComune(comuneRaw);
    const omiZone = pickField(rec, 'Zona', 'ZONA');
    const linkZona = pickField(rec, 'LinkZona', 'Link_Zona', 'LINKZONA');
    const codTipRaw = pickField(rec, 'Cod_Tip', 'Cod_tip', 'COD_TIP');
    const codTip = Number.parseInt(codTipRaw, 10);
    const descrTipologia = pickField(rec, 'Descr_Tipologia', 'Descr_tipologia', 'DESCR_TIPOLOGIA');
    const statoRaw = pickField(rec, 'Stato', 'STATO');

    if (!provincia || !comune) {
      bump('missing_comune_or_provincia');
      continue;
    }
    if (!Number.isFinite(codTip)) {
      bump('invalid_cod_tip');
      continue;
    }

    const propertyType = propertyTypeFromOmiCodTip(codTip, descrTipologia);
    if (!propertyType) {
      bump('unsupported_tipologia');
      continue;
    }

    const comprMinRaw = pickField(rec, 'Compr_min', 'Compr_Min', 'COMPR_MIN');
    const comprMaxRaw = pickField(rec, 'Compr_max', 'Compr_Max', 'COMPR_MAX');
    const minParsed = parseEuroToCents(comprMinRaw);
    const maxParsed = parseEuroToCents(comprMaxRaw);
    if (!minParsed || !maxParsed) {
      bump('missing_compravendita_values');
      continue;
    }
    if (maxParsed.cents < minParsed.cents) {
      bump('inverted_min_max');
      continue;
    }

    const stato = normalizeOmiStato(statoRaw, codTip);
    const rectified = minParsed.rectified || maxParsed.rectified;

    rows.push({
      provincia,
      comune,
      omiZone,
      linkZona,
      codTip,
      descrTipologia,
      stato,
      rectified,
      minPerM2Cents: minParsed.cents,
      maxPerM2Cents: maxParsed.cents,
      propertyType,
    });
  }

  return {
    rows,
    skipped: [...skippedMap.entries()].map(([reason, count]) => ({ reason, count })),
    headerLine: headerIdx + 1,
  };
}

export function inferSemesterFromFilename(name: string): string | null {
  const m = name.match(/20(\d{2})([12])/);
  if (!m) return null;
  const year = `20${m[1]}`;
  const half = m[2] === '1' ? 'H1' : 'H2';
  return `${year}-${half}`;
}
