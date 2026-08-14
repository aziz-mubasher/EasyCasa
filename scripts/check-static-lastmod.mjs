#!/usr/bin/env node
/**
 * PP-3 — fail when mapped marketing-page i18n changes without a STATIC_PAGE_LASTMOD bump.
 * Honest-lastmod rule: manual dates, not build-time git stamps.
 *
 * Usage:
 *   node scripts/check-static-lastmod.mjs          # CI check
 *   node scripts/check-static-lastmod.mjs --update # refresh fingerprints after lastmod bump
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_ROOT = join(ROOT, 'apps/web');
const MANIFEST_PATH = join(WEB_ROOT, 'src/lib/static-page-lastmod-manifest.json');
const SITEMAP_ENTRIES_PATH = join(WEB_ROOT, 'src/lib/sitemap-entries.ts');
const LOCALES = ['it', 'en', 'es'];

const updateMode = process.argv.includes('--update');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parseStaticLastmodMap() {
  const src = readFileSync(SITEMAP_ENTRIES_PATH, 'utf8');
  const match = src.match(/export const STATIC_PAGE_LASTMOD[^=]*=\s*\{([\s\S]*?)\};/);
  if (!match) throw new Error('Could not parse STATIC_PAGE_LASTMOD from sitemap-entries.ts');
  const map = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^\s*'([^']*)':\s*'(\d{4}-\d{2}-\d{2})'/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

function extractNamespaces(locale, namespaces) {
  const messages = readJson(join(WEB_ROOT, `messages/${locale}.json`));
  const out = {};
  for (const ns of namespaces) {
    if (!(ns in messages)) {
      throw new Error(`Namespace "${ns}" missing in messages/${locale}.json`);
    }
    out[ns] = messages[ns];
  }
  return out;
}

function fingerprintFor(namespaces) {
  const payload = {};
  for (const locale of LOCALES) {
    payload[locale] = extractNamespaces(locale, namespaces);
  }
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

const manifest = readJson(MANIFEST_PATH);
const lastmodMap = parseStaticLastmodMap();
let failures = 0;

for (const [path, entry] of Object.entries(manifest)) {
  const computed = fingerprintFor(entry.namespaces);
  const mapLastmod = lastmodMap[path];
  if (!mapLastmod) {
    console.error(`static-lastmod: path "${path}" missing from STATIC_PAGE_LASTMOD`);
    failures += 1;
    continue;
  }

  if (updateMode) {
    entry.contentFingerprint = computed;
    entry.lastmod = mapLastmod;
    continue;
  }

  if (entry.lastmod !== mapLastmod) {
    console.error(
      `static-lastmod: manifest lastmod for "${path}" (${entry.lastmod}) != STATIC_PAGE_LASTMOD (${mapLastmod}). Run with --update after reconciling.`,
    );
    failures += 1;
    continue;
  }

  if (computed !== entry.contentFingerprint) {
    console.error(
      `static-lastmod: i18n copy changed for "${path}" (${entry.namespaces.join(', ')}) without lastmod bump. Update STATIC_PAGE_LASTMOD['${path}'] then run: pnpm check:static-lastmod --update`,
    );
    failures += 1;
  }
}

if (updateMode) {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`static-lastmod: updated fingerprints in ${MANIFEST_PATH}`);
  process.exit(0);
}

if (failures > 0) {
  console.error(`check-static-lastmod: ${failures} violation(s)`);
  process.exit(1);
}

console.log('check-static-lastmod: OK');
