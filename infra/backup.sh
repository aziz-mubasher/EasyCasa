#!/usr/bin/env bash
# Nightly Postgres backup + optional offsite via restic. Add to cron.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
set -a; . ./.env; set +a

BACKUP_DIR="$ROOT_DIR/backups"
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/db-$TS.sql.gz"

echo "==> Dumping database to $OUT"
docker compose -f infra/docker-compose.yml --env-file .env exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT"

# Offsite (optional): set RESTIC_REPOSITORY + RESTIC_PASSWORD in .env
if command -v restic >/dev/null 2>&1 && [ -n "${RESTIC_REPOSITORY:-}" ]; then
  echo "==> Pushing to restic repo"
  restic backup "$OUT"
  restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
fi

echo "==> Pruning local backups older than 7 days"
find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime +7 -delete
echo "==> Backup complete"
