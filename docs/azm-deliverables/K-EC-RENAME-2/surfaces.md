# EC-RENAME-2 — surface inventory (Legenda)

**Product / agent name:** Legenda  
**Tagline:** *Legenda legge la perizia. Nella tua lingua.*  
**SSOT:** `packages/shared/src/aste-product/asteProductName.ts`  
**CI ban:** `pnpm check:aste-product-name` (via `pnpm check:counsel-copy`)  
**Supersedes:** EC-RENAME-1 (prior document-product brand)

## Organisation

Legenda is a **product inside the EasyCasa monorepo**, not a separate venture repo. Surfaces live under `/aste/*` in `apps/web`, with API under `apps/api/src/aste`, credits in `@easycasa/shared`.

## Migrated (in-repo)

| Surface | Notes |
|---|---|
| SSOT module | name / slug / tagline / AI disclosure / legacy ban list |
| Stripe `product_data.name` | `asteCreditPackProductName()` |
| Guide delivery email IT/EN/ES | embeds display name + AI assistant wording |
| i18n `aste.productName` / `tagline` / `aiDisclosure` | `apps/web/messages/{it,en,es}.json` |
| Landing hero | EasyCasa → **Legenda** (hero-level) → AI disclosure → tagline as H1 |
| Lab / analisi / report / guida copy | product brand → Legenda |
| Ops / counsel / audit titles | display brand → Legenda |
| Env / schema / migration comments | display brand → Legenda |

## Not migrated

| Surface | Why |
|---|---|
| URL routes `/aste/*` | SEO / inbound links — ops redirect map |
| Code identifiers (`asteAnalisi`, `ASTE_ANALYSIS_ENABLED`, …) | API/DB stability |
| Meta WhatsApp templates | Outside repo |
| Ads / already-sent mail | Outside repo |
| HI / UR / PA catalogues | **None exist** (only `it`/`en`/`es`) |

## RTL

**No current surface handles RTL.** `apps/web/src/i18n/routing.ts` locales are `['it','en','es']` only. No `dir="rtl"`, no Urdu locale, no bidi utilities. Shape of future work: locale + message catalogues (byte-safe), root `dir`, mirrored layout tokens, bidi for Latin terms/figures inside Urdu runs, numeral policy — dedicated brief, not this rename.

## Flagged REMED (not fixed here)

`financing_needed` capture + `AffordThisHomeReferralBlock` → Banks4All (`utm_campaign=aste`) still live on the report journey.
