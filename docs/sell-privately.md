# EC-S-T01 / EC-SELL-PRIVATELY-1 — Sell Privately (`vendi-da-privato`)

**Route:** `/{locale}/vendi-da-privato` · EN `/en/sell-privately` · ES `/es/vender-entre-particulares`  
**Placement:** Site footer, column “Per chi vende”.  
**Roadmap:** `docs/ec-s-roadmap.md` · **Claims:** `docs/ec-s-claims-register.md`

## Promise ledger

`apps/web/src/config/sell-privately/promises.json` (+ `promises.schema.json`)  
validated by `apps/web/src/lib/promiseLedger` and `apps/web/scripts/validate-promise-ledger.mjs`  
(build-time in `next.config.mjs`).

| Field | Values |
|---|---|
| `promises.P*.state` | `live` \| `coming` \| `hidden` \| **`retracted`** |
| `promises.P*.licence_state` | `ponte` \| `agente` \| `oam` (company state is `companyLicenceState`) |
| `promises.P*.tasks` | roadmap / polish ids |
| `blocks.*.state` | `live` \| `fallback` \| `hidden` \| **`retracted`** |

`visiblePromiseEntries` drops `hidden` and `retracted`, and drops rows whose `licence_state` excludes the company state. A `coming` chip on a claim that will never ship is forbidden — that is why P4 is `retracted`, not `coming`.

How-it-works chips are derived in `getSellPrivatelySteps()`:

| Step id | Binding | Chip |
|---|---|---|
| `price` | P2 | live |
| `docs` | P6 | live |
| `verify` | P3 | live |
| `list` | none (assisted draft + mandatory review not shipped) | coming |
| `meet` | **you** (by design) | you |
| `viewings` | P5 | live |

P4 (Verified Buyer / Banks4All financial badge) is **retracted**. It must not render as a tile, step, or FAQ promise.

New rows: **P9** publishing is free (`live`, all licence states) · **P10** no commission either side (`live`, **`ponte` only** — review at month 12) · **P11** energy figures required (`live` because R4 ships in the same PR) · **P12** buyer’s own pre-approval (`coming` until Credit Prime + DPIA).

`PERIMETER` (EC-AYNI-1 PR 2) is **not in the repo**. Company state is `companyLicenceState` on this document until that registry exists.

## Page structure (11 blocks)

Hero · money band · what you do / what we do · how it goes · what we will never do · APE (gated on P11) · buyer pre-approval (coming copy while P12 is `coming`) · what it costs · agency directory · FAQ · footer with the non-enrolment sentence.

The seller intro film stays, bound to the “watch how it works” CTA.

## R4 — energy figures at publish

`assertPublishEnergyFigures` in `@easycasa/shared`. Called from:

- `ListingsService.publish` — web form, owner, API, admin
- WordPress ETL `upsertListing` — refuses `published` without both figures
- demo + pilot listing sinks

The add-listing form also blocks client-side and explains why. Existing published rows are **counted, not mutated** (`docs/audits/EC-SELL-PRIVATELY-1-energy-count.md`).

## SEO (T33)

- Localized canonical + hreflang `it` / `en` / `es` / `x-default`
- `og:locale`: `it_IT` / `en` / `es_ES` (not `en_GB`)
- `meta.keywords` removed
- Rewrites; legacy ES `/vender-como-particular` → 308
