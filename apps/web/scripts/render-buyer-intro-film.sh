#!/usr/bin/env bash
# Render the 16:9 buyer intro (IT master) to an MP4. Not committed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
FILM="$ROOT/apps/web/public/for-buyers/film"
OUT="${1:-/opt/cursor/artifacts/easycasa-for-buyers-intro-it.mp4}"
STILLS="$(mktemp -d)"
PORT="${PORT:-8765}"
cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then kill "$SERVER_PID" 2>/dev/null || true; fi
  rm -rf "$STILLS"
}
trap cleanup EXIT

python3 -m http.server "$PORT" --directory "$FILM" --bind 127.0.0.1 >/tmp/buyer-intro-http.log 2>&1 &
SERVER_PID=$!
sleep 0.4

CHROME="${CHROME:-google-chrome}"
for i in 0 1 2 3 4 5 6 7; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --window-size=1920,1080 \
    --screenshot="$STILLS/s$i.png" \
    "http://127.0.0.1:${PORT}/intro.html?lang=it&record=1&still=1&scene=$i" \
    >/tmp/buyer-intro-chrome.log 2>&1
done

# Hold each still for the scene duration, then concat.
# 8,10,10,10,10,10,10,9 seconds
DURATIONS=(8 10 10 10 10 10 10 9)
LIST="$STILLS/list.txt"
: > "$LIST"
for i in 0 1 2 3 4 5 6 7; do
  ffmpeg -y -hide_banner -loglevel error \
    -loop 1 -t "${DURATIONS[$i]}" -i "$STILLS/s$i.png" \
    -vf "fps=30,format=yuv420p" \
    -c:v libx264 -preset veryfast -crf 20 \
    "$STILLS/c$i.mp4"
  printf "file '%s'\n" "$STILLS/c$i.mp4" >> "$LIST"
done

mkdir -p "$(dirname "$OUT")"
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$LIST" \
  -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -movflags +faststart \
  "$OUT"
echo "$OUT"
