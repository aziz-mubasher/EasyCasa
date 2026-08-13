#!/usr/bin/env bash
# EC-S-T33 — forbid raw JSON.stringify in files that emit application/ld+json.
# Portable grep fallback (K EC 1.45 pattern) — no hard rg dependency.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
HITS=0

if command -v rg >/dev/null 2>&1; then
  list_ld_files() {
    rg -l 'application/ld\+json' "$WEB" --glob '*.ts' --glob '*.tsx' 2>/dev/null || true
  }
  has_raw_stringify() {
    rg -q 'JSON\.stringify' "$1" 2>/dev/null
  }
else
  list_ld_files() {
    grep -rl 'application/ld+json' "$WEB" --include='*.ts' --include='*.tsx' 2>/dev/null || true
  }
  has_raw_stringify() {
    grep -q 'JSON\.stringify' "$1" 2>/dev/null
  }
fi

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  if has_raw_stringify "$file"; then
    echo "JSON-LD must use serializeJsonLd via JsonLdScript — raw JSON.stringify in: $file" >&2
    HITS=$((HITS + 1))
  fi
done < <(list_ld_files)

if [[ "$HITS" -gt 0 ]]; then
  echo "check-json-ld-escape: $HITS violation(s)" >&2
  exit 1
fi

echo "check-json-ld-escape: OK"
