# Phase 22 — Saved Searches + Alerts

**Goal:** save a Phase 20 search (filters + area) and get alerted when new listings match. P0 #4 from the Phase 19 matrix. Builds on Phase 20 matching and Phase 7/14 device registration.

Adapted from the Prisma scaffold to **Drizzle** (`migration/sql/0015_phase22.sql`). Reuses existing `saved_searches.query` as Phase 20 criteria JSON; adds `frequency` / `last_run_at` and `alert_logs` for dedup.

---

## The key reuse

A saved search *is* a stored Phase 20 query (`filters` + `bbox`/`polygon`) plus a frequency. Matching uses the **exact same predicates** as live map search — `matchesFilters` + (`pointInPolygon` when a polygon was drawn, else `inBBox`).

---

## API

```
POST   /me/saved-searches                 { name, criteria, frequency } → SavedSearch
GET    /me/saved-searches                 → SavedSearch[]
PUT    /me/saved-searches/:id/frequency   { frequency }
DELETE /me/saved-searches/:id
```

Frequencies: `instant` · `daily` · `off`.

Internal: `AlertsService.onListingPublished(pin)` on listing publish; `AlertsService.runDigests()` for a scheduled daily job (call from cron — not wired yet).

Dedup: `alert_logs` unique `(saved_search_id, listing_id)` — a listing alerts a given saved search at most once.

---

## Client

`EasyCasaSavedSearchesApi` in `@easycasa/api-client` (`phase22.ts`). Legacy `getSavedSearches()` still maps list responses into the older `{ params, alertsEnabled }` shape for mobile.

---

## Caveats

- Instant fan-out is O(instant saved searches) per publish — fine to launch; geo reverse-index later.
- Digest scheduling is not wired — call `runDigests()` daily (e.g. 08:00 Europe/Rome).
- `NotificationSender` writes in-app (+ push console transport); wire real push/email providers next.
- No per-user alert rate limit yet.
