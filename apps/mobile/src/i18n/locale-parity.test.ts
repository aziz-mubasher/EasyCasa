import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const LOCALES_DIR = path.join(process.cwd(), 'src/i18n/locales');
const LOCALES = ['en', 'it', 'es'] as const;

function flatten(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return [prefix];
  return entries.flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
}

function groupName(file: string): string | null {
  if (/^(en|it|es)\.json$/.test(file)) return 'base';
  const match = file.match(/^(.+)\.(en|it|es)\.json$/);
  return match?.[1] ?? null;
}

describe('locale key parity', () => {
  it('gives it, en and es the same keys in every bundle', () => {
    const files = readdirSync(LOCALES_DIR).filter((name) => name.endsWith('.json'));
    const groups = new Map<string, Partial<Record<(typeof LOCALES)[number], string>>>();
    for (const file of files) {
      const group = groupName(file);
      const locale = file.match(/(en|it|es)\.json$/)?.[1] as (typeof LOCALES)[number] | undefined;
      if (!group || !locale) continue;
      const bucket = groups.get(group) ?? {};
      bucket[locale] = file;
      groups.set(group, bucket);
    }

    for (const [group, filesByLocale] of groups) {
      const keySets = LOCALES.map((locale) => {
        const file = filesByLocale[locale];
        assert.ok(file, `${group} is missing ${locale}`);
        const json = JSON.parse(readFileSync(path.join(LOCALES_DIR, file), 'utf8')) as unknown;
        return flatten(json).sort();
      });
      assert.deepEqual(keySets[1], keySets[0], `${group}: it keys differ from en`);
      assert.deepEqual(keySets[2], keySets[0], `${group}: es keys differ from en`);
    }
  });

  it('does not name a percentage fee or an offer intent', () => {
    const files = readdirSync(LOCALES_DIR).filter((name) => name.endsWith('.json'));
    for (const file of files) {
      const raw = readFileSync(path.join(LOCALES_DIR, file), 'utf8');
      assert.equal(/provvigione|commission|comisión|ratePercent/i.test(raw), false, file);
      const json = JSON.parse(raw) as unknown;
      const keys = flatten(json);
      assert.equal(
        keys.some((key) => key === 'offer' || key.endsWith('.offer')),
        false,
        `${file} still has an offer intent key`,
      );
    }
  });
});
