# Redirect Map (SEO-safe cutover)

`pnpm --filter @easycasa/migration redirects` builds the old→new URL map:
- upserts rows into the `redirects` table,
- exports `migration/out/redirects.csv`,
- exports `migration/out/redirects.caddy` (drop-in `redir` lines for the Caddyfile).

## How old URLs are derived
- Listings: `WP_PERMALINK_BASE + /<slug>/` → `/listings/<slug>`
- Pages: `/<slug>/` → `/<slug>`
- Posts: `/blog/<slug>/` → `/guide/<slug>`

Verify `WP_PERMALINK_BASE` against the live **Settings → Permalinks** before trusting
the output. Multilingual URLs (EN/IT/ES) must be added once the i18n routing is set in
Phase 3 — extend `redirects.ts` to emit per-locale paths.

## Using the output at cutover (Phase 6)
Include the generated Caddy snippet inside the site block, or serve redirects from
the API. Always keep the 301 status so link equity transfers.
