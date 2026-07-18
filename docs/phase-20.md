# Phase 20 — Map-Search Backend

**Goal:** the discovery engine the homepage already promises ("search the map across thousands of homes") — viewport search, **draw-to-search** polygons, filters, and **clustering** — P0 #1 from the Phase 19 matrix.

Adapted onto the existing Meilisearch `listings` index (Phase 7 text search kept as `GET /search`).

---

## What it does

- **Viewport search** (`POST /search/bounds`) — map bounds + zoom → clusters + capped pins.
- **Draw-to-search** (`POST /search/area`) — polygon mask after bbox pre-filter.
- **Filters** — deal type, price, property types, min rooms, min m², **energy class**.
- **Clustering** — zoom-dependent grid; singletons at zoom ≥ 16.

Index (Meili) does bbox + attributes; domain does polygon mask + cluster (unit-tested).

---

## API

```
POST /search/bounds   { minLat,minLng,maxLat,maxLng, zoom, filters? }  → { clusters, pins, total }
POST /search/area     { polygon:[{lat,lng}...], zoom, filters? }        → { clusters, pins, total }
GET  /search          (unchanged — text/facet search)
```

Both map routes are `@Public`.

---

## Index fields (listings)

Filterable: `_geo`, `transactionType`, `price`, `rooms`, `sizeSqm`, `propertyType`, `energyClass`, `status`, …

Backfill: `pnpm --filter @easycasa/api search:backfill`

---

## Caveats

- Grid clustering (not Supercluster); swap behind `clusterPins` if needed.
- Dense polygons: consider PostGIS `ST_Within` instead of fetch-then-mask.
- No rate limit on public search yet.
- List panel is cheapest-first only.
