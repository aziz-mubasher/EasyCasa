#!/usr/bin/env bash
# EC-RENAME-1 — ban former auction product display names; assert i18n matches SSOT.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SSOT="$ROOT/packages/shared/src/aste-product/asteProductName.ts"
MSG_DIR="$ROOT/apps/web/messages"

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
)

FAIL=0
while IFS= read -r -d '' f; do
  rel="${f#"$ROOT"/}"
  case "$rel" in
    packages/shared/src/aste-product/*) continue ;;
    scripts/check-aste-product-name.sh) continue ;;
    # Bridge status may briefly mention rename context — still ban here; keep summaries clean.
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

# Assert message catalogues carry SSOT display names.
node <<'NODE'
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const ssot = fs.readFileSync(path.join(root, 'packages/shared/src/aste-product/asteProductName.ts'), 'utf8');
const expected = {
  it: /it:\s*'Dossier Asta'/.test(ssot) ? 'Dossier Asta' : null,
  en: /en:\s*'Auction Dossier'/.test(ssot) ? 'Auction Dossier' : null,
  es: /es:\s*'Dossier de Subasta'/.test(ssot) ? 'Dossier de Subasta' : null,
};
let fail = 0;
for (const [loc, name] of Object.entries(expected)) {
  if (!name) {
    console.error('SSOT missing display name for', loc);
    fail = 1;
    continue;
  }
  const j = JSON.parse(fs.readFileSync(path.join(root, 'apps/web/messages', `${loc}.json`), 'utf8'));
  if (j.aste?.productName !== name) {
    console.error(`aste.productName mismatch (${loc}): expected "${name}", got "${j.aste?.productName}"`);
    fail = 1;
  }
  const blob = JSON.stringify(j);
  if (!blob.includes(name)) {
    console.error(`messages/${loc}.json does not contain SSOT name "${name}"`);
    fail = 1;
  }
}
if (fail) process.exit(1);
console.log('OK: aste.productName matches SSOT for it/en/es');
NODE

if [[ "$FAIL" -ne 0 ]]; then
  echo "EC-RENAME-1 product-name ban failed" >&2
  exit 1
fi

echo "OK: no banned auction product display names in tree"
