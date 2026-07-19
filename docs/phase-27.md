# Phase 27 — Free AVM (Automated Valuation)

**Goal:** free instant min/mid/max home valuation (table stakes + lead magnet into paid certified valuation).

Adapted from the Prisma scaffold to **Drizzle** (`migration/sql/0017_phase27.sql`).

---

## Engine

Pure, deterministic (`apps/api/src/avm/domain/`):

1. **Comparables** — same type, ≤3 km, ±40% area, ≤24 months.
2. **Feature adjustment** — energy / condition / floor multipliers.
3. **Weighting** — closer, size-similar, recent comps weigh more.
4. **OMI blend** — pull out-of-band estimates halfway into the official band; OMI-only when fewer than 3 comps.
5. **Confidence** — `high` / `medium` / `low` from count + dispersion.

Basis: `comparables` | `blended` | `omi`.

---

## API

```
POST /avm/estimate   { subject, contactEmail? }  → { estimate, requestId }   (@Public)
```

`estimate` = `{ pointCents, minCents, maxCents, pricePerM2Cents, confidence, basis, comparablesUsed }`.

When `contactEmail` or a soft-authenticated user (`@OptionalUser` on public routes) is present, the request is logged in `valuation_requests` and `requestId` is returned.

---

## Data

| Table | Purpose |
|-------|---------|
| `omi_quotes` | Cached Agenzia delle Entrate OMI €/m² bands |
| `valuation_requests` | Lead capture (subject + estimate snapshot) |

Comps come from published `listings` (asking prices) in the subject's provincia.

---

## Client / mobile

- `@easycasa/api-client` → `EasyCasaValuationApi`
- Expo: `(owner)/valuation` screen + owner-home entry; EN/IT/ES locales

---

## Caveats

- Asking-price comps (upward bias vs sold prices).
- OMI table starts empty — until seeded, estimates are comps-only (or 422 when sparse).
- Geocoding stubbed (Milan lat/lng placeholder on the screen).
- Not a formal valuation — UI disclaimer + CTA for certified service (order wire-up follow-up).
- GDPR: treat `valuation_requests` as personal data.
