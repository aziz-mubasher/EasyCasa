#!/usr/bin/env bash
# EC-S-T23 — forbid recommendation / advice tokens in sellerAnalytics i18n keys.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MSG_DIR="$ROOT/apps/web/messages"
MISSING=0
for locale in it en es; do
  f="$MSG_DIR/$locale.json"
  if [[ ! -f "$f" ]]; then
    echo "missing $f" >&2
    MISSING=1
    continue
  fi
  # Extract sellerAnalytics block (naive: lines containing the namespace or nested under it
  # via jq if available; else grep the whole file for forbidden tokens only near keys —
  # we scan the sellerAnalytics object via node for reliability).
  if ! node -e '
    const fs = require("fs");
    const path = process.argv[1];
    const locale = process.argv[2];
    const j = JSON.parse(fs.readFileSync(path, "utf8"));
    const block = j.sellerAnalytics;
    if (!block) {
      console.error("missing sellerAnalytics namespace in " + locale);
      process.exit(2);
    }
    const text = JSON.stringify(block);
    const re = /ti consigliamo|dovresti|prezzo giusto|prezzo consigliato|dovresti abbassare|alza il prezzo|consigliamo di/i;
    const m = text.match(re);
    if (m) {
      console.error("FORBIDDEN token in sellerAnalytics (" + locale + "): " + m[0]);
      process.exit(1);
    }
    console.log("OK: " + locale + " sellerAnalytics — no advice tokens");
  ' "$f" "$locale"; then
    MISSING=1
  fi
done
if [[ "$MISSING" -ne 0 ]]; then
  exit 1
fi
echo "OK: no forbidden advice tokens in sellerAnalytics.*"
