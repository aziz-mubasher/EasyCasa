import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function findSqlDir(start = process.cwd()): string {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'migration/sql');
    if (existsSync(candidate)) return candidate;
    const parent = join(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`migration/sql not found from ${start}`);
}

const SQL_DIR = findSqlDir();

/**
 * 0016 seeded `legal_basis = 'mediazione'` on three buyer-side items.
 * That is the defect. Future seeds must not write any other value than
 * `review_required`. 0016 is left as history; 0075 corrects live rows.
 */
/** 0016 is the historical defect. CREATE TYPE in 0009 names the enum values. */
const HISTORICAL = new Set(['0009_phase10.sql', '0016_phase24.sql']);

const BANNED = /legal_basis\s*,?\s*['"]?(mediazione|mandato_oneroso|MEDIAZIONE|MANDATO_ONEROSO)['"]?/i;
const BANNED_VALUES = /['"](mediazione|mandato_oneroso)['"]/i;

describe('legal_basis seeds', () => {
  it('future migrations do not seed a legal_basis other than review_required', () => {
    const files = readdirSync(SQL_DIR).filter((f) => f.endsWith('.sql') && !HISTORICAL.has(f));
    const offenders: string[] = [];
    for (const file of files) {
      const sql = readFileSync(join(SQL_DIR, file), 'utf8');
      if (!/legal_basis/i.test(sql)) continue;
      const lines = sql.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (line.trimStart().startsWith('--')) continue;
        if (BANNED.test(line) || (line.includes('legal_basis') && BANNED_VALUES.test(line))) {
          offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
