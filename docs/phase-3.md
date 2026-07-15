# Phase 3 — Frontend + Search (checklist)

Goal: the new public site with map-first, faceted search — visibly better than WP.
Next.js (App Router, TS) + Tailwind + next-intl (IT/EN/ES) + MapLibre, consuming the
Phase 2 API. Meilisearch index pipeline lives in the API.

## Design system (cartographic / civic)
- Palette: ink `#16233B`, paper `#F5F4EF`, majolica azure `#1E5AE0`, pine `#1F6F5C`,
  sand `#E7DFCF`, clay `#C4553B` (alerts only). Tokens in `app/globals.css`, wired
  through `tailwind.config.ts`.
- Type: **Bricolage Grotesque** (display), **Newsreader** (body serif),
  **IBM Plex Mono** for all measurements (prices, m², coordinates) — the `.data`/`.eyebrow`
  classes make numbers read like cadastral survey marks. This mono-for-data rule is the
  signature; keep it consistent.
- The map is the hero, not a big-number stat block.

## Run
```bash
# API side: index existing listings, then serve
pnpm --filter @easycasa/api search:backfill
pnpm --filter @easycasa/api start:dev
# Web
pnpm --filter @easycasa/web dev   # http://localhost:3000/it
```

## Steps & acceptance criteria
- [x] **1. Design system + layout.** Done when: tokens/fonts load; header/footer/locale switcher work; IT/EN/ES routing via `[locale]`.
- [x] **2. Index pipeline.** Done when: `search:backfill` populates Meilisearch; publishing a listing indexes it (hooked in `ListingsService.publish`).
- [x] **3. Search UI.** Done when: `/search` shows results + facet filters + map markers from `GET /search`.
- [x] **4. Listing detail.** Done when: `/listings/:slug` renders gallery/attrs/map/QR + schema.org JSON-LD.
- [ ] **5. Add-home flow.** Done when: the 3-step wizard posts to `/listings` and uploads media via presign→PUT→confirm.
- [ ] **6. User area.** Done when: favorites + saved searches work against `/me/*` (needs auth session, Phase 4).
- [ ] **7. Editorial.** Done when: home + static pages render from the headless CMS/content table.
- [x] **8. Performance + PWA.** Done when: images optimised, Core Web Vitals green, `app/manifest.ts` installable.

## Verified in this scaffold
- `pnpm --filter @easycasa/api typecheck` ✅ and tests ✅ (8)
- `pnpm --filter @easycasa/web typecheck` ✅
- Meilisearch module + `/search` endpoint + backfill wired; publish indexes documents.

> Note: `next build` downloads Google Fonts at build time — run it where the build
> host has network access (CI/VPS). Local sandboxes without font access will fail there
> only, not in typecheck.

## Cursor prompts (one PR each)
1. "Wire the add-home wizard to the API: on Publish, POST /listings, then for each photo call POST /media/presign, PUT the file, POST /media/confirm; show progress + errors."
2. "Add map 'search this area': on MapView moveend, read bounds and refetch GET /listings?minLat&minLng&maxLat&maxLng, syncing markers + list."
3. "Add autocomplete for cities/regions to the search bar backed by a new /search/suggest endpoint (Meilisearch)."
4. "Add a Gallery component to listing detail with keyboard nav + blur placeholders from media.placeholder."
5. "Connect NextAuth/OIDC session so favorites and saved-searches call /me/* with the bearer token."

## Guardrails
- All user-facing strings via next-intl messages — no hardcoded copy.
- Measurements use `.data` (mono); labels use `.eyebrow`.
- Server components fetch via `API_URL`; client via `NEXT_PUBLIC_API_URL`.
