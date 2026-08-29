#!/usr/bin/env bash
# EC-RENAME-2 — ban former auction product display names; assert i18n matches SSOT.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SSOT="$ROOT/packages/shared/src/aste-product/asteProductName.ts"

if [[ ! -f "$SSOT" ]]; then
  echo "missing SSOT $SSOT" >&2
  exit 1
fi

# Banned phrases (product brand). The SSOT file may list them in LEGACY_BANNED.
BANNED_PATTERNS=(
  'Analisi Aste'
  'Auction Analysis'
  'Análisis Aste'
  'Analisis Aste'
  'Dossier Asta'
  'Auction Dossier'
  'Dossier de Subasta'
)

FAIL=0
while IFS= read -r -d '' f; do
  rel="${f#"$ROOT"/}"
  case "$rel" in
    packages/shared/src/aste-product/*) continue ;;
    scripts/check-aste-product-name.sh) continue ;;
  esac
  for pat in "${BANNED_PATTERNS[@]}"; do
    if grep -F -n -- "$pat" "$f" >/dev/null 2>&1; then
      echo "FORBIDDEN product name '$pat' in $rel:" >&2
      grep -F -n -- "$pat" "$f" >&2 || true
      FAIL=1
    fi
  done
done < <(find "$ROOT" \
  \( -path "$ROOT/node_modules" -o -path "$ROOT/.git" -o -path "*/dist/*" -o -path "*/.next/*" -o -path "*/coverage/*" \) -prune -o \
  -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.json' -o -name '*.md' -o -name '*.html' -o -name '*.sql' -o -name '.env.example' -o -name '*.sh' \) -print0)

# Assert message catalogues carry SSOT display name, tagline, AI disclosure.
node <<'NODE'
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const ssot = fs.readFileSync(path.join(root, 'packages/shared/src/aste-product/asteProductName.ts'), 'utf8');

function pick(block, locale) {
  const re = new RegExp(locale + ":\\s*'([^']+)'");
  const m = block.match(re);
  return m ? m[1] : null;
}

function extractConst(name) {
  const re = new RegExp('export const ' + name + ' = \\{([\\s\\S]*?)\\} as const');
  const m = ssot.match(re);
  return m ? m[1] : '';
}

const names = extractConst('ASTE_PRODUCT_NAME');
const taglines = extractConst('ASTE_PRODUCT_TAGLINE');
const disclosures = extractConst('ASTE_PRODUCT_AI_DISCLOSURE');

let fail = 0;
for (const loc of ['it', 'en', 'es']) {
  const name = pick(names, loc);
  const tagline = pick(taglines, loc);
  const disclosure = pick(disclosures, loc);
  if (!name || !tagline || !disclosure) {
    console.error('SSOT incomplete for', loc, { name, tagline, disclosure });
    fail = 1;
    continue;
  }
  const j = JSON.parse(fs.readFileSync(path.join(root, 'apps/web/messages', `${loc}.json`), 'utf8'));
  if (j.aste?.productName !== name) {
    console.error(`aste.productName mismatch (${loc}): expected "${name}", got "${j.aste?.productName}"`);
    fail = 1;
  }
  if (j.aste?.tagline !== tagline) {
    console.error(`aste.tagline mismatch (${loc}): expected "${tagline}", got "${j.aste?.tagline}"`);
    fail = 1;
  }
  if (j.aste?.aiDisclosure !== disclosure) {
    console.error(`aste.aiDisclosure mismatch (${loc}): expected "${disclosure}", got "${j.aste?.aiDisclosure}"`);
    fail = 1;
  }
}
if (fail) process.exit(1);
console.log('OK: aste.productName / tagline / aiDisclosure match SSOT for it/en/es');
NODE

if [[ "$FAIL" -ne 0 ]]; then
  echo "EC-RENAME-2 product-name ban failed" >&2
  exit 1
fi

echo "OK: no banned auction product display names in tree"
