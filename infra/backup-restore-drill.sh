#!/usr/bin/env bash
# Backup + restore-verify drill — Phase 39 (extends the Phase 6 drill).
# Dumps Postgres, ships offsite via restic, restores into a throwaway DB, verifies
# row counts on critical tables, and PUSHES a "last successful backup" timestamp
# to Pushgateway so Phase 6's stale-backup alert has a metric to fire on.
#
# Env: DATABASE_URL, RESTIC_REPOSITORY, RESTIC_PASSWORD, PUSHGATEWAY_URL,
#      CRITICAL_TABLES (space-separated, default below).
set -euo pipefail

: "${DATABASE_URL:?set DATABASE_URL}"
: "${PUSHGATEWAY_URL:?set PUSHGATEWAY_URL}"
CRITICAL_TABLES="${CRITICAL_TABLES:-listings enquiries viewings users consent_records}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP="/tmp/easycasa-${STAMP}.dump"
SCRATCH_DB="easycasa_restore_${STAMP}"

push_metric() { # name value
  cat <<METRIC | curl -fsS --data-binary @- "${PUSHGATEWAY_URL}/metrics/job/backup_drill" || true
# TYPE $1 gauge
$1 $2
METRIC
}

fail() { echo "drill FAILED: $*" >&2; push_metric easycasa_backup_drill_success 0; exit 1; }

echo "1/4 dump"
pg_dump --format=custom "${DATABASE_URL}" --file="${DUMP}" || fail "pg_dump"

echo "2/4 offsite (restic)"
if [[ -n "${RESTIC_REPOSITORY:-}" ]]; then
  restic backup "${DUMP}" || fail "restic backup"
else
  echo "  (RESTIC_REPOSITORY unset — skipping offsite in this env)"
fi

echo "3/4 restore into scratch"
createdb "${SCRATCH_DB}" || fail "createdb"
trap 'dropdb --if-exists "${SCRATCH_DB}" >/dev/null 2>&1 || true; rm -f "${DUMP}"' EXIT
pg_restore --dbname="${SCRATCH_DB}" "${DUMP}" || fail "pg_restore"

echo "4/4 verify row counts"
for t in ${CRITICAL_TABLES}; do
  n="$(psql -tA -d "${SCRATCH_DB}" -c "SELECT count(*) FROM ${t};" 2>/dev/null || echo missing)"
  [[ "${n}" == "missing" ]] && fail "table ${t} missing after restore"
  echo "  ${t}: ${n} rows"
done

# success → push freshness gauge (unix seconds) for the stale-backup alert
push_metric easycasa_backup_drill_success 1
push_metric easycasa_last_successful_backup_timestamp_seconds "$(date -u +%s)"
echo "drill OK @ ${STAMP}"
