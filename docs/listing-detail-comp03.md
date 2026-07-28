# Listing detail — Screen 03 (comp-03)

Reference: `docs/comp-03-listing-detail.html` · Startup task EC-7 Part 2.

## Live route

`/{locale}/listings/{slug}` (not `/listings` index — that 404s).

## Decisions shipped

| Item | Decision |
|------|----------|
| Energy class / EPI | Already in schema (`energy_class`, `energy_performance_kwh_m2_y`); surfaced in scheda with APE badge |
| OMI block | Feature-flagged (`NEXT_PUBLIC_VALUATION_BAND_ENABLED`); comune vs microzone labelled honestly; ochre for estimates; Entrate attribution |
| Agency chrome | Removed from aside; private owner + no-commission copy |
| Layout | Gallery main+side, scheda register, sticky aside CTAs |

## Out of scope here

Screens 01–02, Geopoi polygon load, self-hosted font subsetting (Part 1 remainder).
