# EC-S-36 follow-up — `routeLead` off in PONTE

**Date:** 2026-09-15  
**Kind:** disable, not delete.  
**Depends on:** `docs/audits/EC-S-lead-routing-census.md` (read-only census, 2026-09-07).

The census found `PartnersService.routeLead` reachable, unflagged, unused as data. EC-PRICING-FINAL R3 requires it **off** while the company is not enrolled.

## What changed

`routeLead` returns `null` immediately when `isPonte()` is true (`packages/shared/src/corporate-state.ts`). No `leads` row is written. The method and the `POST /conversations` caller stay in place so a later `LicenceState` can turn the path back on without archaeology.

This is not a deletion. The census remains the record of what the path did.
