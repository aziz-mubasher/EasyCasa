# EC-RENAME-1 — surface inventory

**Product:** Legenda (EN: Legenda · ES: Legenda)  
**SSOT:** `packages/shared/src/aste-product/asteProductName.ts`  
**CI ban:** `pnpm check:aste-product-name` (wired into `pnpm check:counsel-copy`)

## Migrated (in-repo)

| Surface | Path / key |
|---|---|
| Display name SSOT | `packages/shared/src/aste-product/*` |
| Stripe Checkout `product_data.name` | `asteCreditPackProductName()` → SSOT IT |
| Guide delivery email IT/EN/ES | `apps/api/src/email/templates/templates.ts` |
| i18n `aste.productName` + product copy | `apps/web/messages/{it,en,es}.json` (`aste`, `asteGuida`, `asteLab`, `asteAnalisi`, `asteReport`) |
| Ops / counsel docs titles | `docs/runbooks/aste-*`, `docs/legal/*aste*`, `docs/audits/G1-*` |
| Env comments | `.env.example` |
| Schema / config comments | `apps/api/src/db/schema.ts`, `apps/api/src/config/load.ts`, `apps/web/src/lib/aste-analysis-config.ts` |
| Migration comment | `migration/sql/0046_aste_leads.sql` |

## Not migrated (by design / out of repo)

| Surface | Why |
|---|---|
| URL routes `/aste`, `/aste/analisi`, `/aste/lab`, `/aste/guida` | SEO / inbound links — ops redirect map (§5), not a silent code rewrite |
| Code identifiers (`asteAnalisi`, `openAnalisi`, `ASTE_ANALYSIS_ENABLED`, table names) | Internal API/DB stability; not user-facing brand |
| Admin UI heading `Aste` | Category label, not product brand |
| Meta WhatsApp template bodies | Live on Meta, not in repo |
| Paid ads creative | Outside repo |
| Already-sent emails / PDFs | Not retro-fixable |
| HI / UR / PA message catalogues | **None exist** in this repo (only `it`/`en`/`es`) |

## Flagged (not fixed in this PR) — REMED

Auction report journey still captures `financing_needed` and can surface `AffordThisHomeReferralBlock` → Banks4All UTMs (`utm_campaign=aste`). Brief §2.4 / §7: **credit-need capture / lender routing is a REMED item**, not rename scope.
