#!/usr/bin/env bash
# Read-only copy of the five live overlays out of the running containers.
# Does not compose, pull, recreate, or print secrets.
set -euo pipefail

API="${API_CONTAINER:-easycasa-ita-api-1}"
AI="${AI_CONTAINER:-easycasa-ita-ai-1}"
STAMP="${STAMP:-$(date -u +%Y%m%d-%H%M)}"
OUT="${OUT:-/tmp/easycasa-overlay-extract-${STAMP}}"

docker inspect "$API" >/dev/null
mkdir -p "$OUT"

api_files=(
  apps/api/src/aste/aste-extract-guards.ts
  apps/api/src/aste/aste-credits.service.ts
  apps/api/src/aste/aste-report.service.ts
  apps/api/src/aste/aste-ai.client.ts
  apps/api/src/omi/omi.controller.ts
  apps/api/src/omi/omi-zone.service.ts
  apps/api/src/aste/aste-trial.service.ts
  apps/api/src/aste/aste-trial-request.ts
  apps/api/src/aste/aste-trial-retention.scheduler.ts
  apps/api/src/aste/aste-ip-bucket.ts
  apps/api/src/aste/aste-analysis.controller.ts
  apps/api/src/aste/aste.module.ts
  apps/api/src/db/schema.ts
  apps/api/src/auth/jwt-verifier.ts
  apps/api/src/auth/auth.types.ts
  packages/shared/src/index.ts
)

echo "extract_to $OUT"
for rel in "${api_files[@]}"; do
  dest="$OUT/$rel"
  mkdir -p "$(dirname "$dest")"
  if docker exec "$API" test -e "/repo/$rel"; then
    docker cp "$API:/repo/$rel" "$dest"
    echo "ok $rel"
  else
    echo "missing $rel" >&2
  fi
done

if docker exec "$API" test -d /repo/packages/shared/src/identity; then
  mkdir -p "$OUT/packages/shared/src/identity"
  docker cp "$API:/repo/packages/shared/src/identity/." "$OUT/packages/shared/src/identity/"
  echo "ok packages/shared/src/identity/"
fi
if docker exec "$API" test -d /repo/packages/shared/src/trial; then
  mkdir -p "$OUT/packages/shared/src/trial"
  docker cp "$API:/repo/packages/shared/src/trial/." "$OUT/packages/shared/src/trial/"
  echo "ok packages/shared/src/trial/"
fi

mkdir -p "$OUT/services/ai/app/services"
if docker exec "$AI" test -e /app/app/services/aste_translate.py; then
  docker cp "$AI:/app/app/services/aste_translate.py" \
    "$OUT/services/ai/app/services/aste_translate.py"
  echo "ok services/ai/app/services/aste_translate.py (from $AI)"
elif docker exec "$API" test -e /repo/services/ai/app/services/aste_translate.py; then
  docker cp "$API:/repo/services/ai/app/services/aste_translate.py" \
    "$OUT/services/ai/app/services/aste_translate.py"
  echo "ok services/ai/app/services/aste_translate.py (from $API /repo)"
else
  echo "missing aste_translate.py" >&2
fi

cat >"$OUT/README.txt" <<EOF
Live overlay extract $STAMP
Source: $API:/repo + $AI translate
Next: copy into a fresh EasyCasa main checkout. Merge schema.ts. Do not compose up the live API.
See docs/runbooks/easycasa-overlay-extract.md
EOF

echo "done $OUT"
echo "next: clone EasyCasa, checkout main, copy this tree, review schema.ts, commit there"
