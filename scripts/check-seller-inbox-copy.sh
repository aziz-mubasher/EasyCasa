#!/usr/bin/env bash
# EC-S-T20 / T04 row 6 — forbid solvency / ranking wording in seller inbox i18n.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FILES=(
  "$ROOT/apps/web/messages/it.json"
  "$ROOT/apps/web/messages/en.json"
  "$ROOT/apps/web/messages/es.json"
)
# Extract sellerInbox blocks and scan for forbidden tokens (IT/EN/ES counsel set).
PATTERN='solvibilit|solvency|credit.?score|punteggio|ranking|ready buyer|acquirente pronto|garantisce|garantisce solv|financially qualified|qualificat[oa] finanzi'

for f in "${FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "missing $f" >&2
    exit 1
  fi
  # Pull sellerInbox object via node for reliable JSON slice
  SLICE="$(node -e "
    const d=require('$f');
    if (!d.sellerInbox) { console.error('missing sellerInbox in $f'); process.exit(2); }
    process.stdout.write(JSON.stringify(d.sellerInbox));
  ")"
  if echo "$SLICE" | grep -Ein "$PATTERN" >/dev/null; then
    echo "FORBIDDEN solvency/ranking token in sellerInbox ($f)" >&2
    echo "$SLICE" | grep -Ein "$PATTERN" >&2 || true
    exit 1
  fi
done
echo "OK: sellerInbox i18n has no solvency/ranking wording"
