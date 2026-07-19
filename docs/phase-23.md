# Phase 23 — Seeker Discovery UI

**Goal:** make Phases 20–22 visible in the Expo seeker app — map search, listing detail, and saved searches.

Consumes Phase 20 (`searchByBounds` / `searchByArea`), Phase 21 (`getListing` / `getSimilar`), Phase 22 (`EasyCasaSavedSearchesApi`).

---

## Screens & flow

- **Map search** (`app/(search)/index.tsx`) — debounced viewport → bounds search; filter sheet; tap-to-draw polygon → area search; save search; results peek.
- **Listing detail** (`app/listing/[slug].tsx`) — Phase 21 detail (UUID or slug); APE badge, catastal, similar strip. Param kept as `slug` for existing deep links.
- **Saved searches** (`app/(search)/saved.tsx`) — frequency toggle + delete (auth required).

Default landing: `(tabs)/index` redirects to `/(search)`. Legacy map tab is hidden (`href: null`) and also redirects.

`DiscoveryProvider` sits under Auth + QueryClient in the root layout.

---

## Web map

`DiscoveryMap.web.tsx` uses MapLibre (same engine as Phase 7 web map), matching native props.

---

## Caveats

- Contact-agent CTA is still a placeholder (enquiry funnel next).
- Draw mode is tap-to-add-vertex (not freehand).
- Debounce 350ms; list peeks 4 cheapest pins.
