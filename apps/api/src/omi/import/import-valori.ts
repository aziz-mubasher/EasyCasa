import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { sql } from 'drizzle-orm';

import type { Db } from '../../db/drizzle';
import { omiQuotes } from '../../db/schema';
import { inferSemesterFromFilename, parseOmiValoriCsv } from '../parse-valori-csv';

export const OMI_ATTRIBUTION = 'Fonte: Agenzia delle Entrate – OMI';

export interface ImportOmiValoriOptions {
  period: string;
  licenceUrl: string;
  attribution?: string;
  /** When true, rows are stored with geo_level=comune (no microzone in source). */
  comuneLevelOnly?: boolean;
}

export interface ImportOmiValoriReport {
  period: string;
  rowsParsed: number;
  rowsUpserted: number;
  comuniCovered: number;
  skipped: { reason: string; count: number }[];
}

async function loadCsvText(input: string): Promise<string> {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`Failed to download ${input}: ${res.status}`);
    return res.text();
  }
  return readFile(input, 'utf8');
}

export async function importOmiValoriFromText(
  db: Db,
  csvText: string,
  options: ImportOmiValoriOptions,
): Promise<ImportOmiValoriReport> {
  const parsed = parseOmiValoriCsv(csvText);
  const attribution = options.attribution ?? OMI_ATTRIBUTION;
  const geoLevel = options.comuneLevelOnly ? 'comune' : 'microzone';
  let upserted = 0;
  const comuni = new Set<string>();

  for (const row of parsed.rows) {
    comuni.add(`${row.provincia}|${row.comune}`);
    await db
      .insert(omiQuotes)
      .values({
        comune: row.comune,
        provincia: row.provincia,
        type: row.propertyType,
        minPerM2Cents: row.minPerM2Cents,
        maxPerM2Cents: row.maxPerM2Cents,
        period: options.period,
        omiZone: row.omiZone || '',
        linkZona: row.linkZona || null,
        codTip: row.codTip,
        descrTipologia: row.descrTipologia,
        stato: row.stato || '',
        rectified: row.rectified,
        geoLevel,
        licenceUrl: options.licenceUrl,
        attribution,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          omiQuotes.period,
          omiQuotes.provincia,
          omiQuotes.comune,
          omiQuotes.omiZone,
          omiQuotes.type,
          omiQuotes.stato,
          omiQuotes.codTip,
        ],
        set: {
          minPerM2Cents: row.minPerM2Cents,
          maxPerM2Cents: row.maxPerM2Cents,
          linkZona: row.linkZona || null,
          descrTipologia: row.descrTipologia,
          rectified: row.rectified,
          geoLevel,
          licenceUrl: options.licenceUrl,
          attribution,
          updatedAt: new Date(),
        },
      });
    upserted++;
  }

  return {
    period: options.period,
    rowsParsed: parsed.rows.length,
    rowsUpserted: upserted,
    comuniCovered: comuni.size,
    skipped: parsed.skipped,
  };
}

export async function importOmiValoriFromPath(
  db: Db,
  inputPath: string,
  options: Partial<ImportOmiValoriOptions> & Pick<ImportOmiValoriOptions, 'licenceUrl'>,
): Promise<ImportOmiValoriReport> {
  const csvText = await loadCsvText(inputPath);
  const period =
    options.period ??
    inferSemesterFromFilename(basename(inputPath)) ??
    (() => {
      throw new Error('Could not infer semester — pass --semester YYYY-H1|H2');
    })();
  return importOmiValoriFromText(db, csvText, {
    period,
    licenceUrl: options.licenceUrl,
    attribution: options.attribution,
    comuneLevelOnly: options.comuneLevelOnly,
  });
}

/** Count rows in omi_quotes (for runbook / smoke). */
export async function countOmiQuotes(db: Db): Promise<number> {
  const result = await db.execute(sql`SELECT COUNT(*)::int AS c FROM omi_quotes`);
  const row = result.rows[0] as { c: number } | undefined;
  return row?.c ?? 0;
}

export async function countOmiComuni(db: Db): Promise<number> {
  const result = await db.execute(
    sql`SELECT COUNT(DISTINCT (provincia, comune))::int AS c FROM omi_quotes`,
  );
  const row = result.rows[0] as { c: number } | undefined;
  return row?.c ?? 0;
}
