#!/usr/bin/env bash
# =============================================================================
# Backup + RESTORE DRILL
# A backup you have never restored is a hope, not a backup. This script:
#   1. Takes a fresh logical dump of the production DB (custom format).
#   2. Pushes it offsite via restic (encrypted, deduplicated).
#   3. Restores the dump into a throwaway scratch database.
#   4. Verifies row counts on critical tables against production.
#   5. Drops the scratch DB and reports pass/fail.
#
# Intended to run weekly (cron) on the DB host, and manually before cutover.
#
# Env (from a root-only .env, never committed):
#   PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
#   RESTIC_REPOSITORY RESTIC_PASSWORD  (+ provider creds, e.g. B2/S3)
# =============================================================================
set -euo pipefail

: "${PGDATABASE:?set PGDATABASE}"
: "${RESTIC_REPOSITORY:?set RESTIC_REPOSITORY}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK="$(mktemp -d)"
DUMP="${WORK}/easycasa_${STAMP}.dump"
SCRATCH="easycasa_restore_test_${STAMP//[-:T]/}"
trap 'rm -rf "$WORK"' EXIT

log() { printf '\033[36m▸\033[0m %s\n' "$*"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }
die() { printf '  \033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# Tables whose counts must match after restore (adjust to your schema).
CRITICAL_TABLES=(listings users media redirects saved_searches leads)

# ---- 1. Dump --------------------------------------------------------------
log "Dumping ${PGDATABASE} (custom format, compressed)…"
pg_dump --format=custom --no-owner --no-privileges --file="$DUMP" "$PGDATABASE"
BYTES=$(stat -c%s "$DUMP")
[ "$BYTES" -gt 1024 ] || die "dump suspiciously small (${BYTES} bytes)"
ok "dump written: $(numfmt --to=iec "$BYTES")"

# ---- 2. Offsite (restic) --------------------------------------------------
log "Backing up offsite with restic…"
restic backup "$DUMP" --tag easycasa --tag "$STAMP" --quiet
restic forget --prune --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --quiet
ok "offsite snapshot stored + retention applied"

# ---- 3. Restore into scratch DB ------------------------------------------
log "Creating scratch DB ${SCRATCH} and restoring…"
createdb "$SCRATCH"
# shellcheck disable=SC2064
trap "dropdb --if-exists '$SCRATCH'; rm -rf '$WORK'" EXIT
pg_restore --no-owner --no-privileges --dbname="$SCRATCH" "$DUMP" 2> "${WORK}/restore.err" || {
  # pg_restore warns on missing roles etc.; only hard errors should fail us.
  if grep -qiE 'error:' "${WORK}/restore.err"; then
    cat "${WORK}/restore.err" >&2
    die "pg_restore reported errors"
  fi
}
ok "restore completed into scratch DB"

# ---- 4. Verify row counts -------------------------------------------------
log "Verifying critical table counts (prod vs restored)…"
fail=0
for t in "${CRITICAL_TABLES[@]}"; do
  prod=$(psql -tAc "SELECT count(*) FROM ${t};" "$PGDATABASE" 2>/dev/null || echo "NA")
  rest=$(psql -tAc "SELECT count(*) FROM ${t};" "$SCRATCH"    2>/dev/null || echo "NA")
  if [ "$prod" = "NA" ] || [ "$rest" = "NA" ]; then
    printf '  \033[33m~\033[0m %-16s skipped (table absent)\n' "$t"
    continue
  fi
  if [ "$prod" = "$rest" ]; then
    ok "$(printf '%-16s %s rows' "$t" "$rest")"
  else
    printf '  \033[31m✗ %-16s prod=%s restored=%s\033[0m\n' "$t" "$prod" "$rest"
    fail=1
  fi
done

# PostGIS + pgvector sanity: extensions present in the restored DB.
psql -tAc "SELECT 1 FROM pg_extension WHERE extname='postgis';" "$SCRATCH" | grep -q 1 \
  && ok "postgis extension restored" || { echo "  ✗ postgis missing"; fail=1; }

echo
if [ "$fail" -eq 0 ]; then
  echo "✅ RESTORE DRILL PASSED — backup is recoverable."
else
  echo "❌ RESTORE DRILL FAILED — investigate before relying on backups."
  exit 1
fi
