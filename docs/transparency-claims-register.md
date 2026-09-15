# Transparency (`/[locale]/transparency`) — claims register

**Date:** 15 September 2026 · **Page:** `https://easycasaita.com/en/transparency`  
**State:** `PONTE` · **valid_from:** 2026-09-15 · **expires_when:** `licence_state != PONTE` or a named €0 row changes  
**review_owner:** AZM product-owner · **counsel_status:** not-reviewed · **signedBy:** AZM (not counsel)

`PERIMETER` from EC-AYNI-1 is not in this repo. Until it is, `apps/web/src/lib/transparency-honesty.spec.ts` is the build check for the rows below.

| Claim | State | Why | Gate |
|---|---|---|---|
| Public list is fixed-price; no live % of sale | `live` | `listPublicCatalogItems()` drops `provvigione` in PONTE; `FULL_MEDIATION` / `BUYER_MEDIATION` are `active: false`. | G1 / T1 |
| Source catalogue still has 2.49% SKUs | `live` (disclosed) | Named on the page. PR A (delete the SKUs) not shipped. | G1 |
| Search + booking a viewing are free | `live` | Distinguished from accompaniment. | T2 |
| Viewing accompaniment €49 / Offer drafting €99 | `live` (named, inactive) | Still in `catalog.ts`, not on `/pricing`. Offer drafting stays counsel-gated (T04 row 11). | T2 |
| Credit Prime named; referral unremunerated | `live` | art. 128-sexies c. 1-bis TUB. | T5 |
| Item 01 = source and semester | `live` | Not a 68.31 stima. | T4 |
| Item 02 / agencies €0 | `live` (qualified) | `routeLead` returns null in PONTE; EC-S-36 census: 0 rows. Agencies €0 during the pilot; end date not set. | G4 / T3 |
| Item 04 no exclusivity required to publish | `live` (qualified) | Mandate `exclusive` flag exists in code; not a live portal lock-in. | T7 |
| Item 05 featured/boost | `live` (disclosed) | Labelled flat-fee placement can raise search rank. T04 row 8. | T7 |
| Identity hole + Mundida licence | `live` | Same `/pricing` hole. EasyCasa described as a product; Ayni S.r.l. not published as the live operator (`LEGAL_ENTITY` absent). | T5 / §5 |
| Art. 52 / 59 + ODR | `live` | Same consumer facts as `/pricing`. | T10 |
| Limits list (5 items) | `live` | Do not expand. | §11 |

## Held

- **EC-PRICING-1 PR A** — deleting `FULL_MEDIATION` / `BUYER_MEDIATION` from `catalog.ts`. Product decision.
- **Pilot end date** for agencies €0.
- **Ayni S.r.l. as named live entity** — CLAUDE.md on this repo is still v1 (Mundida). Footer hole stays until `LEGAL_ENTITY`.
- **OFFER_DRAFTING removal** — counsel on acquisto-assistito §A1.
- Full `PERIMETER` object — EC-AYNI-1 PR 2.
