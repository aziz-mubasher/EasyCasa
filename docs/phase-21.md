# Phase 21 — Listing-Detail Surface

**Goal:** the property page — gallery, key facts, **energy/APE**, **catastal reference**, map, a **quality score**, and a **similar-listings** strip. P0 #3 from the Phase 19 matrix.

Adapted from the Prisma scaffold to **Drizzle** (`migration/sql/0014_phase21.sql`). Uses existing `media` for photos/floor plans.

---

## API

```
GET /listings/:id            → ListingDetail when :id is a UUID (map → detail)
GET /listings/:slug          → legacy web payload when :slug is not a UUID
GET /listings/:id/similar    → SimilarPin[] (max 6, same provincia + deal type, price proximity)
```

Both detail paths are `@Public`.

Detail includes: price + €/m², key facts, APE, catastal display, quality score (0–100 + `missing`), gallery, agent.

---

## Caveats

- Similar is price-proximity within province/deal type (not geo yet).
- Quality weights are a starting point.
- APE document download from fascicolo is a follow-up.
- Web slug pages still use the legacy payload until the Next.js listing page is upgraded.
