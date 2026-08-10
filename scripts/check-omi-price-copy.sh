#!/usr/bin/env bash
# EC-S-T09 — forbid recommendation / advice tokens in the OMI pricing panel module.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/apps/web/src/components/listings/OmiPricePanel.tsx"
if [[ ! -f "$TARGET" ]]; then
  echo "missing $TARGET" >&2
  exit 1
fi
# Case-insensitive token scan
if grep -Ein 'ti consigliamo|dovresti|prezzo giusto|prezzo consigliato' "$TARGET"; then
  echo "FORBIDDEN token found in OmiPricePanel (T04 matrix row 3)" >&2
  exit 1
fi
echo "OK: no forbidden OMI advice tokens in pricing panel"
