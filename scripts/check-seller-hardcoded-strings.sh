#!/usr/bin/env bash
# EC-S-T31 — forbid hardcoded user-facing copy on seller wizard + dashboard surfaces.
# Scopes:
#   apps/web/src/components/seller/**
#   apps/web/app/[locale]/seller/**
# Also asserts quota 429 render sites use errors.quota.* (not prose literals).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HITS=0

scan_dirs=(
  "$ROOT/apps/web/src/components/seller"
  "$ROOT/apps/web/app/[locale]/seller"
)

for d in "${scan_dirs[@]}"; do
  if [[ ! -d "$d" ]]; then
    echo "missing scan dir: $d" >&2
    exit 1
  fi
done

# 1) JSX text nodes with letters (prose) between a tag and a closing tag.
# Requires a following </ so TypeScript generics (Promise<void>) are ignored.
# Punctuation-only nodes (e.g. em dash) are ignored by the letter requirement.
while IFS= read -r line; do
  echo "HARDCODED JSX text: $line" >&2
  HITS=$((HITS + 1))
done < <(
  rg -n --glob '*.tsx' \
    '>[^<{]*[A-Za-zÀ-ÿ]{2,}[^<]*</' \
    "${scan_dirs[@]}" 2>/dev/null || true
)

# 2) Prose string literals in UI attributes (placeholder / aria-label / title / alt).
# Allow URL-ish placeholders.
while IFS= read -r line; do
  if echo "$line" | rg -q 'placeholder=["'\'']https?://'; then
    continue
  fi
  echo "HARDCODED attr copy: $line" >&2
  HITS=$((HITS + 1))
done < <(
  rg -n --glob '*.tsx' \
    '(placeholder|aria-label|title|alt)=["'\''][^"'\'']*[A-Za-zÀ-ÿ]{3,}[^"'\'']*["'\'']' \
    "${scan_dirs[@]}" 2>/dev/null || true
)

# 3) setError with multi-word prose (internal short keys like 'load' / 'unavailable' are OK).
while IFS= read -r line; do
  echo "HARDCODED setError prose: $line" >&2
  HITS=$((HITS + 1))
done < <(
  rg -n --glob '*.tsx' \
    "setError\(['\"][^'\"]*[ ][^'\"]*['\"]\)" \
    "${scan_dirs[@]}" 2>/dev/null || true
)

# 4) Raw machine codes / slugs rendered as children without t( — legacy `{p}` / `{c}`.
while IFS= read -r line; do
  echo "HARDCODED raw code render: $line" >&2
  HITS=$((HITS + 1))
done < <(
  rg -n --glob '*.tsx' \
    '>\s*\{[pc]\}\s*<' \
    "${scan_dirs[@]}" 2>/dev/null || true
)

# 5) Quota render sites must use errors.quota (activeListings / uploadsPerDay), not prose.
WIZARD="$ROOT/apps/web/src/components/seller/SellerListingWizard.tsx"
if [[ -f "$WIZARD" ]]; then
  if ! rg -q "useTranslations\(['\"]errors\.quota['\"]\)" "$WIZARD"; then
    echo "HARDCODED quota: $WIZARD must use useTranslations('errors.quota')" >&2
    HITS=$((HITS + 1))
  fi
  if rg -n "setError\(['\"][^'\"]*[Ll]imit[^'\"]*['\"]\)|setError\(['\"][^'\"]*[Qq]uota[^'\"]*['\"]\)" "$WIZARD" >/dev/null; then
    echo "HARDCODED quota prose in setError in $WIZARD" >&2
    HITS=$((HITS + 1))
  fi
  if ! rg -q "status === 429" "$WIZARD"; then
    echo "WARN: no 429 handler in SellerListingWizard (expected for quota)" >&2
  elif ! rg -n -A5 "status === 429" "$WIZARD" | rg -q "activeListings|uploadsPerDay"; then
    echo "HARDCODED quota: 429 handler must render errors.quota.activeListings|uploadsPerDay" >&2
    HITS=$((HITS + 1))
  fi
fi

if [[ "$HITS" -ne 0 ]]; then
  echo "FAIL: $HITS hardcoded seller string hit(s) (EC-S-T31)" >&2
  exit 1
fi

echo "OK: no hardcoded user-facing strings on seller wizard/dashboard surfaces"
