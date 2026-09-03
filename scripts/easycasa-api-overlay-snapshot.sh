#!/usr/bin/env bash
# Snapshot the running EasyCasa API overlay. Does not restart anything.
#
# Two copies. They can drift — after every edit, copy this file to the VPS:
#   scripts/easycasa-api-overlay-snapshot.sh
#   /root/azm/easycasa-api-overlay-snapshot.sh
# See docs/runbooks/easycasa-api-overlays.md
#
# N1 — keepers are azm-keep-overlay-<UTC stamp>. Never easycasa-ita-api-*.
# N2 — docker commit copies compose labels; override them on every create.
# N3 — recreate is a different script: scripts/easycasa-api-overlay-recreate.sh
set -euo pipefail

CONTAINER="${CONTAINER:-easycasa-ita-api-1}"
KEEP="${KEEP:-3}"
STAMP="$(date -u +%Y%m%d-%H%M)"
TAG="overlay-${STAMP}"
IMAGE="easycasa-ita-api:${TAG}"
KEEPER="azm-keep-overlay-${STAMP}"

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "missing container $CONTAINER" >&2
  exit 1
fi

echo "==> commit $CONTAINER -> $IMAGE"
docker commit \
  --message "easycasa api overlay $TAG" \
  --author "overlay-snapshot" \
  --change "LABEL azm.overlay=easycasa-api azm.overlay.date=${TAG}" \
  "$CONTAINER" "$IMAGE"
docker tag "$IMAGE" easycasa-ita-api:overlay-current

if docker inspect "$KEEPER" >/dev/null 2>&1; then
  echo "==> keeper $KEEPER already exists"
else
  echo "==> stopped keeper $KEEPER (survives docker image prune -af)"
  docker create \
    --name "$KEEPER" \
    --label azm.overlay=easycasa-api \
    --label com.docker.compose.project=azm-overlay-keep \
    --label com.docker.compose.service=keep \
    --label com.docker.compose.container-number=0 \
    --label traefik.enable=false \
    "$IMAGE" >/dev/null
fi

echo "==> keep last $KEEP keepers"
mapfile -t OLD < <(
  docker ps -a --filter label=azm.overlay=easycasa-api --filter status=created \
    --format '{{.CreatedAt}}\t{{.Names}}\t{{.Image}}' | awk -F'\t' '$2 ~ /^azm-keep-overlay-/' | sort -r | tail -n +"$((KEEP + 1))"
)
for row in "${OLD[@]:-}"; do
  [ -z "$row" ] && continue
  name=$(printf '%s\n' "$row" | cut -f2)
  image=$(printf '%s\n' "$row" | cut -f3)
  [ "$name" = "$CONTAINER" ] && continue
  echo "    drop $name ($image)"
  docker rm "$name" >/dev/null
  if [ "$image" != "easycasa-ita-api:overlay-current" ] && [ "$image" != "easycasa-ita-api:latest" ]; then
    docker rmi "$image" >/dev/null 2>&1 || true
  fi
done

echo "==> images"
docker images easycasa-ita-api --format 'table {{.Tag}}\t{{.ID}}\t{{.CreatedSince}}\t{{.Size}}'
echo "==> keepers"
docker ps -a --filter label=azm.overlay=easycasa-api --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
echo "==> running API untouched"
docker inspect "$CONTAINER" --format 'status={{.State.Status}} started={{.State.StartedAt}}'
