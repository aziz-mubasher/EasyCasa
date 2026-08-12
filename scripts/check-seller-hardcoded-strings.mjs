#!/usr/bin/env node
/**
 * EC-S-T31 / K EC 1.45 — forbid hardcoded user-facing copy on seller wizard + dashboard.
 * Portable Node reimplementation (no ripgrep dependency — CI runners may lack `rg`).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const SCAN_DIRS = [
  join(ROOT, 'apps/web/src/components/seller'),
  join(ROOT, 'apps/web/app/[locale]/seller'),
];

const WIZARD = join(ROOT, 'apps/web/src/components/seller/SellerListingWizard.tsx');

/** @param {string} dir */
function walkTsx(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkTsx(p));
    else if (name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

/** @param {string} file */
function readLines(file) {
  return readFileSync(file, 'utf8').split('\n');
}

/** @param {string} file @param {RegExp} re */
function scanFile(file, re) {
  /** @type {string[]} */
  const hits = [];
  const rel = relative(ROOT, file);
  readLines(file).forEach((line, i) => {
    if (re.test(line)) hits.push(`${rel}:${i + 1}:${line.trim()}`);
  });
  return hits;
}

function main() {
  /** @type {string[]} */
  const hits = [];

  for (const dir of SCAN_DIRS) {
    try {
      statSync(dir);
    } catch {
      console.error(`missing scan dir: ${dir}`);
      process.exit(1);
    }
    for (const file of walkTsx(dir)) {
      hits.push(
        ...scanFile(file, />[^<{]*[A-Za-zÀ-ÿ]{2,}[^<]*<\//),
        ...scanFile(
          file,
          /(placeholder|aria-label|title|alt)=["'][^"']*[A-Za-zÀ-ÿ]{3,}[^"']*["']/,
        ).filter((line) => !/placeholder=["']https?:\/\//.test(line)),
        ...scanFile(file, /setError\(["'][^"']*[ ][^"']*["']\)/),
        ...scanFile(file, />\s*\{[pc]\}\s*</),
      );
    }
  }

  if (statSync(WIZARD, { throwIfNoEntry: false })) {
    const wizardText = readFileSync(WIZARD, 'utf8');
    if (!/useTranslations\(['"]errors\.quota['"]\)/.test(wizardText)) {
      hits.push(`HARDCODED quota: ${relative(ROOT, WIZARD)} must use useTranslations('errors.quota')`);
    }
    if (/setError\(["'][^"']*[Ll]imit[^"']*["']\)|setError\(["'][^"']*[Qq]uota[^"']*["']\)/.test(wizardText)) {
      hits.push(`HARDCODED quota prose in setError in ${relative(ROOT, WIZARD)}`);
    }
    if (/status === 429/.test(wizardText)) {
      const block = wizardText.slice(wizardText.indexOf('status === 429'));
      if (!/activeListings|uploadsPerDay/.test(block.slice(0, 400))) {
        hits.push('HARDCODED quota: 429 handler must render errors.quota.activeListings|uploadsPerDay');
      }
    }
  }

  if (hits.length > 0) {
    for (const h of hits) console.error(`HARDCODED: ${h}`);
    console.error(`FAIL: ${hits.length} hardcoded seller string hit(s) (EC-S-T31)`);
    process.exit(1);
  }

  console.log('OK: no hardcoded user-facing strings on seller wizard/dashboard surfaces');
}

main();
