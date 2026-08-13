# EC-S-T33 / K EC 1.46 — completion R&D feedback (for Claude)

**As of tip `c6e4fdc` on `main` after PR #140 (T33 SEO wiring) + G7 ledger merge.** G7 already cleared (`NEXT_PUBLIC_DEMO_MODE=false`). No seller/monetisation flag flips. No new SQL migrations. **Web rebuilt** on VPS; API image unchanged (`fa63487`) — expected for web-only land.

## Merged PR

| PR | Task | Notes |
|----|------|-------|
| [#140](https://github.com/aziz-mubasher/EasyCasa/pull/140) | K EC 1.46 / T33 | JSON-LD via `serializeJsonLd`, sitemap honesty, sell-privately FAQPage+Service, CI escape guard |
| [#139](https://github.com/aziz-mubasher/EasyCasa/pull/139) | G7 docs | Ledger confirm (conflict-resolved into tip; T33 dispatched doc kept) |

## What landed

1. **`JsonLdScript`** — single emission path; all `application/ld+json` through `serializeJsonLd`.
2. **Listing detail** — `RealEstateListing` via shared `buildRealEstateListing` (+ `listing-json-ld` mapper).
3. **Sell-privately** — `FAQPage` + `Service` from G4 i18n (`sell-privately-schema.ts`); Organisation still on layout.
4. **Sitemap** — localized sell-privately URLs + hreflang; static `lastmod` constants; listings use API `updated_at`; `/seller/enquiries` excluded while dark.
5. **CI** — `scripts/check-json-ld-escape.sh` on `check:counsel-copy` (grep/rg portable).
6. **Demo noindex** — removed from layout/home metadata (ops flag already false; `robots.ts` still guards if re-enabled).

## VPS verify (post-deploy)

| Check | Result |
|-------|--------|
| Disk tip | `c6e4fdc` |
| `/api/version` | `fa63487` (API image not rebuilt) |
| `/it` noindex | none |
| `robots.txt` | `Allow: /` + sitemap |
| Sell page JSON-LD | `FAQPage`, `Service`, `Organization` present |
| Sitemap | `/it/vendi-da-privato`, `/en/sell-privately`, `/es/vender-entre-particulares` with cross-hreflang |
| Flags | unchanged (inbox / boost / premium / directory still false) |

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Wired pre-staged shared builders + `serializeJsonLd`; replaced raw stringify paths in web.
- CI grep guard with portable grep fallback (K EC 1.45 pattern).
- Sell-privately schema from i18n only; no new counsel copy / savings figures.
- ES slug + hreflang covered via existing rewrites + sitemap tests.
- Honest sitemap lastmod; dark seller route excluded.
- Demo-mode component `noindex` removed; HOLD doc superseded.
- **Skipped in CI:** Lighthouse SEO ≥95 — operator commands documented; AZM still needs to run on prod.

### 2. WHERE THE BRIEF FAILED YOU
- **Missing `buildService` in shared** — brief implied Service was pre-staged; only RealEstate / FAQ / serialize existed. Agent added web-local `sell-privately-schema.ts` (correct, but next brief should either stage `buildService` in shared or say “web-local OK”).
- **Ambiguous static lastmod** — “real content-change dates” with no CMS: used fixed `STATIC_PAGE_LASTMOD` map; must be bumped manually when marketing copy changes.
- **Geo** — old listing JSON-LD had `GeoCoordinates`; shared builder has no geo field. Kept T04-safe shared shape (no geo).
- **Lighthouse in “VALIDATION GATES”** — not runnable in this CI environment; don’t gate merge on scores unless a job exists.

### 3. REPO REALITY CHECK
- Stack: pnpm monorepo, Next 14 App Router, next-intl IT/EN/ES, Vitest, Nest API, `@easycasa/shared`.
- Pre-staged: `packages/shared/src/structured-data/`; tests under `apps/api/src/seo/structured-data.spec.ts` (shared has no vitest runner).
- Sell paths: IT `/vendi-da-privato`, EN `/sell-privately`, ES `/vender-entre-particulares` (+ legacy ES 308).
- Vitest needed `@/` alias in `apps/web/vitest.config.ts` for new lib tests.
- `gh` merge token is read-only — land via local merge → `git push origin main`.
- VPS: `/opt/easycasa-ita`, Traefik compose; **web-only** `--no-cache` rebuild + `--no-deps --force-recreate web`.

### 4. EFFORT SIGNAL
- Right-sized as one PR after G7. Slightly larger than “wire only” because Service builder + sitemap test harness were not fully pre-staged.

### 5. BLOCKED / NEEDS A HUMAN
- ~~**Lighthouse SEO ≥95**~~ — **done** 2026-08-13: home **100**, vendi-da-privato **100**, listing `demo-sc1-verified` **100** (after listing `generateMetadata` fix `1f1269b`). See `docs/audits/EC-S-t33-lighthouse-scores.md`. Inventory/Meili: **118 published** in sync (earlier empty-sitemap note was a false alarm).
- **G1** counsel T02/T04/T05 + `INFORMATIVA_SELLER_VERSION`.
- Claims 7–8 counsel before boost/directory flags.
- Stripe Price IDs before premium flip.
- Dual inbox flags only after G1.
- Kaizen: mark **K EC 1.46** complete with PR #140 + tip `c6e4fdc`.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Promote Service JSON-LD helper to `@easycasa/shared` if reused.
- Do not re-dispatch T33 — eng closed; only Lighthouse operator residual.
- Remaining roadmap is **human gates**, not eng SEO work: G1 → enablement; Claims 7–8; Stripe; inbox dual-flag.
- HOLDs still: T25, T19.2, VO/checklist/analytics flips, Bunny CDN.
- `valutazione-gratuita` / `acquisto-assistito` Service strings still partially hardcoded English in pages — optional follow-up SEO i18n pass, not T33 scope.
