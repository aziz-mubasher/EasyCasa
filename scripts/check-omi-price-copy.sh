#!/usr/bin/env bash
# EC-S-T09 / T24 — forbid recommendation / advice tokens in observation surfaces.
# T09: OmiPricePanel module. T24: nudges.* i18n keys (IT/EN/ES).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/apps/web/src/components/listings/OmiPricePanel.tsx"
MSG_DIR="$ROOT/apps/web/messages"
FORBIDDEN='ti consigliamo|dovresti|prezzo giusto|prezzo consigliato|considera di|we recommend|you should|consider (lowering|raising|reducing)|deberías|te recomendamos'

if [[ ! -f "$TARGET" ]]; then
  echo "missing $TARGET" >&2
  exit 1
fi

if grep -Ein "$FORBIDDEN" "$TARGET"; then
  echo "FORBIDDEN token found in OmiPricePanel (T04 matrix row 3)" >&2
  exit 1
fi

for loc in it en es; do
  MSG="$MSG_DIR/$loc.json"
  if [[ ! -f "$MSG" ]]; then
    echo "missing $MSG" >&2
    exit 1
  fi
  BLOB="$(node -e "
    const fs=require('fs');
    const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
    if (!j.nudges || typeof j.nudges !== 'object') {
      console.error('missing nudges namespace in', process.argv[1]);
      process.exit(2);
    }
    process.stdout.write(
      Object.entries(j.nudges).map(([k,v]) => 'nudges.' + k + ': ' + v).join('\\n')
    );
  " "$MSG")"
  if printf '%s\n' "$BLOB" | grep -Ein "$FORBIDDEN"; then
    echo "FORBIDDEN token found in nudges.* ($loc) (T04 matrix row 3 / T24)" >&2
    exit 1
  fi
done

echo "OK: no forbidden advice tokens in OMI panel or nudges.* i18n"
