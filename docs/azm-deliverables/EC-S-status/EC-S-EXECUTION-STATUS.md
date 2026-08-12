# EC-S Private Seller Roadmap — Execution Status Audit

**Task:** K EC 1.44 · EC-S Private Seller roadmap — execution status audit (report only)  
**Audit date:** 2026-08-12  
**Repo tip audited:** `051bcfe518096ec50787c7244741f86c921cbf9e` (`main`)  
**Roadmap source:** `docs/ec-s-roadmap.md` (v2, tasks T01–T33)  
**Method:** Code, migrations, env examples, audit docs, and GitHub CI state on `main`. No production `.env` access — VPS flag values marked **UNVERIFIABLE** where noted.

---

## 1. Executive summary

| Metric | Count |
|--------|------:|
| **DONE** (engineering merged on `main`) | 25 |
| **PARTIAL** (code present; scope/counsel/ops gap) | 7 |
| **NOT STARTED** | 1 (T25) |

**T32 consolidation:** Fully merged via PR [#129](https://github.com/aziz-mubasher/EasyCasa/pull/129) at merge commit `267e568` (feature `768ebad`; documented deploy tip `86a7b89`). Current HEAD `051bcfe` is a docs-only follow-up on top of T32.

**Phases 0–4 gap inventory:** No task marked ✅ in the roadmap is entirely absent from `main`. Engineering gaps are **partial scope** (T02/T04/T05 counsel, T10 CDN, T19.2 LIA, T20 web inbox UI, T33 wiring) or **enable-gated** (flags default `false`).

**CI state (GitHub Actions on `051bcfe`):** `api-boot` **PASS**; `CI`, `security`, `api-integration`, `a11y-webvitals` **FAIL** — primary failure: `check:seller-hardcoded-strings` (`scripts/check-seller-hardcoded-strings.sh`) reports hardcoded quota string in `apps/web/src/components/seller/SellerListingWizard.tsx` and `rg: command not found` in CI runner ([run 31533201623](https://github.com/aziz-mubasher/EasyCasa/actions/runs/31533201623)). This is a **regression risk** on `main`, not an EC-S feature gap.

---

## 2. Task matrix T01–T33

Status key: **DONE** = merged on `main` (may be flag-off or counsel-gated); **PARTIAL** = code exists but brief/roadmap exit not met; **NOT STARTED** = no implementation found.

| # | Task | Status | Evidence / ref | Notes |
|---|------|--------|----------------|-------|
| **T01** | “Vendi da privato” page + footer | **DONE** | Page: `apps/web/app/[locale]/vendi-da-privato/page.tsx`, `apps/web/src/components/services/SellPrivatelyPage.tsx`; footer: `apps/web/src/components/Footer.tsx`; rewrites: `apps/web/next.config.mjs` L28–32; PRs [#84](https://github.com/aziz-mubasher/EasyCasa/pull/84), [#87](https://github.com/aziz-mubasher/EasyCasa/pull/87) per `docs/audits/EC-S-phase0-completion-feedback.md` | Lighthouse pack: `docs/audits/T01/REPORT.md` |
| **T02** | Counsel: savings, commission, B4A, mediazione | **PARTIAL** | Packets: `docs/legal/ec-s-t02-counsel-review-packet.md`, `docs/legal/ec-s-t02-claims-7-8-addendum.md`; ledger gate: `apps/web/src/config/sell-privately/promises.json` → `blocks.savingsFigures.state: "fallback"` | ⛔ Counsel sign-off pending — no flip to live figures |
| **T03** | Promise ledger + live/coming chips | **DONE** | `apps/web/src/config/sell-privately/promises.json`, `promises.schema.json`; build gate: `apps/web/next.config.mjs` L8–9; tests: `apps/web/src/lib/promiseLedger/promiseLedger.test.ts` | Shipped with T01 |
| **T04** | Mediazione boundary doc | **PARTIAL** | Matrix: `docs/legal/T04_mediazione_boundary.md`; UI gate: `promises.json` → `blocks.mediazioneCopy.state: "fallback"` | ⛔ Counsel sign-off pending |
| **T05** | Seller-data memo + informativa extension | **PARTIAL** | Memo: `docs/legal/ec-s-t05-seller-data-memo.md`; API gate: `apps/api/src/seller/seller.service.ts` (refuses insert when `INFORMATIVA_SELLER_VERSION` empty); `.env.example` L127 | ⛔ DPO/counsel Layer 1 unsigned |
| **T06** | Seller role + onboarding | **DONE** (flag off) | Migration `migration/sql/0049_ecs_phase1_seller_listing.sql`; module `apps/api/src/seller/`; guard `seller-onboarding.guard.ts`; merge `5bd01b4` / `b940876` per `docs/ec-s-phase1.md` | `SELLER_ONBOARDING_ENABLED=false` |
| **T07** | Guided listing wizard UI | **DONE** | Machine: `packages/shared/src/listing-wizard/`; API: `apps/api/src/listing-drafts/`; UI: `apps/web/app/[locale]/seller/list/page.tsx`, `SellerListingWizard.tsx` | PR-W [#111](https://github.com/aziz-mubasher/EasyCasa/pull/111) |
| **T08** | Address → OMI zone resolution | **DONE** | `apps/api/src/omi/omi.controller.ts`; `docs/ec-s-phase1.md` | |
| **T09** | OMI pricing panel in wizard | **DONE** | `apps/web/src/components/listings/OmiPricePanel.tsx`; CI: `scripts/check-omi-price-copy.sh`; P2 → **live** in `promises.json` | |
| **T10** | Photo pipeline (EXIF → MinIO → CDN) | **PARTIAL** | `apps/api/src/media/media.service.ts`, `media-keys.ts`; `MEDIA_CDN_ENABLED=false` in `.env.example` L128 | EXIF + WebP + content-addressed keys **DONE**; Bunny CDN path **NOT enabled** (DPA gate) |
| **T11** | AI description IT/EN | **DONE** | `services/ai/app/routers/listing_description.py` | |
| **T12** | Duplicate/scraped-image detection | **DONE** (enforce off) | `services/ai/app/dupdetect/`; Nest hook in `media.service.ts`; `IMAGE_DUPDETECT_ENFORCE=false` | Flag-only until calibrated |
| **T13** | Draft autosave + publish/unpublish | **DONE** | Migration `migration/sql/0054_ecs_t13_publish_lifecycle.sql`; merge `fe6a3cf` / PR [#108](https://github.com/aziz-mubasher/EasyCasa/pull/108) per `docs/audits/EC-S-soft-launch-completion-feedback.md` | |
| **T14** | Verified Owner upload + FSM | **DONE** (flag off) | Migration `0052_ecs_phase2_verified_owner.sql`; `apps/api/src/verified-owner/`; PR [#103](https://github.com/aziz-mubasher/EasyCasa/pull/103) | `VERIFIED_OWNER_ENABLED=false` |
| **T15** | Moderation queue + admin UI | **DONE** | `apps/admin/src/pages/VoModeration.tsx`; PR [#104](https://github.com/aziz-mubasher/EasyCasa/pull/104) | |
| **T16** | Owner-name match logic | **DONE** | Shared + `apps/api/src/verified-owner/ownerNameMatch.spec.ts`; bundled in PR #103 | |
| **T17** | Listing-card trust signals | **DONE** | `apps/web/src/components/listing/ListingCard.tsx`; trust i18n in `apps/web/messages/{it,en,es}.json`; PR [#109](https://github.com/aziz-mubasher/EasyCasa/pull/109) | P3 ledger still **coming** (counsel) |
| **T18** | Document checklist engine | **DONE** (flag off) | Migration `0053_ecs_phase2_seller_checklist.sql`; `apps/api/src/seller-checklist/`; PR [#105](https://github.com/aziz-mubasher/EasyCasa/pull/105) | `SELLER_CHECKLIST_ENABLED=false` |
| **T19** | Abuse controls | **PARTIAL** | Stage 1: dup flag, admin abuse, env knobs — merge tip `ebafa63` per `docs/audits/EC-S-phase2-completion-feedback.md` | **T19.2 NOT STARTED** — LIA-gated dup-enforce + suspend UX (roadmap L19) |
| **T19.1** | Hard 429 quota | **DONE** | `apps/api/src/seller-quota/`; merge `1f32340` / PR [#110](https://github.com/aziz-mubasher/EasyCasa/pull/110) | Art. 6(1)(b) — not LIA-gated |
| **T20** | Enquiry inbox + Verified Buyer badge | **PARTIAL** | API: `apps/api/src/seller-inbox/`, migration `0055_ecs_t20_enquiry_inbox.sql`, PR [#112](https://github.com/aziz-mubasher/EasyCasa/pull/112); i18n namespace `sellerInbox` in all 3 locales | **Missing:** web inbox route under `apps/web/app/[locale]/seller/` — no `useTranslations('sellerInbox')` consumer |
| **T21** | Seller-as-conductor viewings | **DONE** (flag off) | `apps/web/app/[locale]/seller/viewings/page.tsx`; migration `0056`; PR [#114](https://github.com/aziz-mubasher/EasyCasa/pull/114) | `SELLER_VIEWINGS_ENABLED=false` |
| **T22** | Open-house mode | **DONE** | Capacity in `apps/api/src/viewings/domain/viewings.spec.ts`; same migration/PR as T21 | |
| **T23** | Listing analytics | **DONE** (flag off) | Migration `0057`; `apps/api/src/seller-analytics/`; UI `seller/listings/[id]/analytics/`; PR [#116](https://github.com/aziz-mubasher/EasyCasa/pull/116) | `SELLER_ANALYTICS_ENABLED=false` |
| **T24** | Price-adjustment nudges | **DONE** (flag off) | Migration `0058`; `apps/api/src/nudges/`; PR [#115](https://github.com/aziz-mubasher/EasyCasa/pull/115) + PR-1 [#121](https://github.com/aziz-mubasher/EasyCasa/pull/121) | Shares T23 flag |
| **T25** | In-portal messaging | **NOT STARTED** | Explicit HOLD: `docs/audits/EC-S-phase3-completion-feedback.md` L19 (“T25 correctly not started — controllership HOLD”); no messaging module in repo | Blocked: T05 §6.5 controllership |
| **T26** | Featured/boosted listing (Stripe) | **DONE** (flag off) | Migration `0062_ecs_t26_listing_boost.sql`; `apps/api/src/listing-boost/`, `featured.controller.ts`; PR [#124](https://github.com/aziz-mubasher/EasyCasa/pull/124) | `LISTING_BOOST_ENABLED=false` |
| **T27** | Premium seller tier | **DONE** (flag off) | Migration `0061_ecs_t27_seller_subscription.sql`; entitlements in `seller-quota.service.ts`; PR [#123](https://github.com/aziz-mubasher/EasyCasa/pull/123) | `SELLER_PREMIUM_ENABLED=false` |
| **T28** | Partner directory | **DONE** (flag off) | Migration `0063_ecs_t28_partner_directory.sql`; `apps/api/src/partner-directory/`; web `partner-directory/page.tsx`; PR [#125](https://github.com/aziz-mubasher/EasyCasa/pull/125) | `PARTNER_DIRECTORY_ENABLED=false` |
| **T29** | Pro media package referral | **DONE** | Bundled with T28; `proMediaNote` in partner i18n; contract test `partner-directory.spec.ts` | Informational only |
| **T30** | Consent-ledger seller consents | **DONE** | Migration `0060_ecs_t30_consent_acceptance_log.sql`; `SellerConsentGuard`; PR [#122](https://github.com/aziz-mubasher/EasyCasa/pull/122); UI completed in T32 | |
| **T31** | i18n wizard + dashboard | **DONE** | CI: `scripts/check-seller-hardcoded-strings.sh`; tests `apps/web/src/lib/seller-surfaces-i18n.spec.ts`; PR [#126](https://github.com/aziz-mubasher/EasyCasa/pull/126) | Roadmap status delta (L12) **stale** — wizard+dashboard ES parity verified |
| **T32** | Consolidation / cross-module tests | **DONE** | Merge `267e568` / PR [#129](https://github.com/aziz-mubasher/EasyCasa/pull/129); `apps/api/src/config/phase4-flag-matrix.spec.ts`; `SellerConsentUpdate.tsx`; `docs/audits/EC-S-t32-completion-feedback.md` | |
| **T33** | SEO harden (schema, sitemap, Lighthouse) | **PARTIAL** | T01 verification PASS perf/hreflang: `docs/audits/T01/REPORT.md`; SEO category FAIL (demo `noindex`); HOLD artifact: `packages/shared/src/structured-data/`, `docs/audits/EC-S-t33-hold.md` | Wiring not dispatched (G7 gate) |

### 2.1 Phases 0–4 — items that did not fully land on `main`

| Roadmap / phase claim | What is missing on `main` |
|-----------------------|----------------------------|
| T02 ⛔ counsel | No counsel sign-off; savings figures remain **fallback** |
| T04 ⛔ counsel | Boundary matrix filed; copy remains **fallback** |
| T05 ⛔ counsel/DPO | `INFORMATIVA_SELLER_VERSION` empty; onboarding insert refused |
| T10 “✅ partial” (`docs/ec-s-phase1.md` L14) | Bunny CDN publish path not operable (`MEDIA_CDN_ENABLED=false`) |
| T19.2 ⛔ LIA HOLD | Dup-enforce + suspend UX not implemented |
| T20 engineering live | API + migration merged; **web seller inbox UI absent** |
| T25 | Entire task on HOLD — no code |
| T33 ⚠ partial | Pre-staged builders only; production JSON-LD still raw `JSON.stringify` |
| All Phase 1–4 feature flags | Default **false** in `.env.example` — routes 404 until human flip |

---

## 3. T33 readiness check

### 3.1 Pre-staged SEO builders + `serializeJsonLd` (+ tests)

| Artifact | Location | Status |
|----------|----------|--------|
| `buildRealEstateListing`, `buildFaqPage` | `packages/shared/src/structured-data/structuredData.ts` L45–94 | ✅ Present |
| `serializeJsonLd` (escapes `<`, `>`, `&`) | Same file L101–105 | ✅ Present |
| Shared export | `packages/shared/src/index.ts` (comment L23) | ✅ Exported |
| Injection-safety tests | `apps/api/src/seo/structured-data.spec.ts` L79+ | ✅ Present |
| HOLD doc | `docs/audits/EC-S-t33-hold.md` | ✅ Explicit “do not wire” |

### 3.2 `StructuredData.tsx` — raw `JSON.stringify` debt

Production web still uses **`<`-only** escaping:

```20:24:apps/web/src/components/StructuredData.tsx
function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
```

Same pattern on sell-privately page inline scripts:

```95:101:apps/web/app/[locale]/vendi-da-privato/page.tsx
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }}
```

**Verdict:** T33 wiring **not done**; shared `serializeJsonLd` is staged but unused in Next.

### 3.3 ES sell-privately slug in rewrites map

| Item | Path / config | Verified |
|------|---------------|----------|
| Canonical ES slug | `/vender-entre-particulares` — `apps/web/src/lib/sell-privately.ts` L19 | ✅ |
| Rewrite | `apps/web/next.config.mjs` L31: `/es/vender-entre-particulares` → `/es/vendi-da-privato` | ✅ |
| Legacy redirect | Same file L22–25: `/es/vender-como-particular` → **308** to canonical | ✅ |
| Sitemap uses localized path | `apps/web/app/sitemap.ts` L47 via `sellPrivatelyPath(l)` | ✅ |

### 3.4 T33 wiring dispatch — exact touch list

Per `docs/audits/EC-S-t32-completion-feedback.md` L50 and `docs/audits/EC-S-t33-hold.md`:

1. **`apps/web/src/components/StructuredData.tsx`** — replace `JsonLd` helper with `@easycasa/shared` `serializeJsonLd` (+ builders).
2. **`apps/web/app/[locale]/vendi-da-privato/page.tsx`** — replace inline `JSON.stringify` FAQ/Service LD with shared builders + `serializeJsonLd`.
3. **CI guard** — add grep/check forbidding raw `JSON.stringify` adjacent to `application/ld+json` (new script or extend existing counsel-copy checks).
4. **`apps/web/app/sitemap.ts`** — confirm listing `lastModified` uses honest `updated_at` (already L64); audit sell-privately static `lastModified: now` (L50) if T33 brief requires content-hash-based lastmod.
5. **Hreflang audit** — re-run T01 verification pack post-G7.
6. **FAQ/Service schema copy** — source strings from G4-approved i18n only (not ad-hoc in page component).
7. **Prerequisite:** G7 — unset `NEXT_PUBLIC_DEMO_MODE` on VPS + web rebuild (`docs/demo-environment.md`, `infra/docker-compose.yml` L88).

---

## 4. Flag / gate matrix

Defaults from `.env.example` and schema in `apps/api/src/config/load.ts`. Production VPS values: **UNVERIFIABLE** (`.env` gitignored; audit docs assert flags remain off and `NEXT_PUBLIC_DEMO_MODE=true` on VPS — `docs/audits/EC-S-t32-completion-feedback.md` L3).

| Flag / env | Default (example + load.ts) | Where read | Purpose |
|------------|----------------------------|------------|---------|
| `SELLER_ONBOARDING_ENABLED` | `false` (`.env.example` L125; `load.ts` L210) | `apps/api/src/seller/seller-onboarding.guard.ts` L17 | T06 — seller routes 404 when off |
| `INFORMATIVA_SELLER_VERSION` | `""` (`.env.example` L127; `load.ts` L215) | `apps/api/src/seller/seller.service.ts` L70, L128, L165 | T05/T06 — empty/malformed ⇒ refuse profile insert |
| `LISTING_BOOST_ENABLED` | `false` (`.env.example` L145; `load.ts` L281) | `apps/api/src/featured/featured.controller.ts` L38 | T26 — boost checkout 404 when off |
| `PARTNER_DIRECTORY_ENABLED` | `false` (`.env.example` L149; `load.ts` L289) | `apps/api/src/partner-directory/partner-directory.guard.ts` L11 | T28/T29 — directory 404 when off |
| `SELLER_PREMIUM_ENABLED` | `false` (`.env.example` L143; `load.ts` L276) | `apps/api/src/billing/stripe.service.ts` L67; `apps/api/src/seller/seller.controller.ts` L78; `apps/api/src/seller-quota/seller-quota.service.ts` L154; `apps/api/src/verified-owner/verified-owner.service.ts` L258 | T27 — premium checkout/entitlements/VO queue priority |
| `NEXT_PUBLIC_DEMO_MODE` | unset/`false` in `.env.example`; `true` in `.env.demo.example` L40 | `apps/web/app/[locale]/layout.tsx` L37 (`noindex` meta); `apps/web/app/robots.ts` L4 (disallow all); `apps/web/app/[locale]/page.tsx` L19; `apps/web/src/components/DemoBanner.tsx` L3; `apps/web/Dockerfile` L15–25 | G7 — sitewide demo banner + SEO block |
| `VERIFIED_OWNER_ENABLED` | `false` (`.env.example` L133; `load.ts` L246) | Verified-owner module guards | T14 counsel gate |
| `SELLER_CHECKLIST_ENABLED` | `false` (`.env.example` L135) | `apps/api/src/seller-checklist/` guards | T18 counsel gate |
| `SELLER_INBOX_ENABLED` | `false` (`.env.example` L137) | `apps/api/src/seller-inbox/seller-inbox.guard.ts` | T20 — after G1 |
| `SELLER_VIEWINGS_ENABLED` | `false` (`.env.example` L139) | Seller viewings controller guard | T21/T22 |
| `SELLER_ANALYTICS_ENABLED` | `false` (`.env.example` L141) | `apps/api/src/seller-analytics/` guard | T23/T24 |
| `MEDIA_CDN_ENABLED` | `false` (`.env.example` L128) | `apps/api/src/media/` + config | T10 Bunny DPA gate |
| `IMAGE_DUPDETECT_ENFORCE` | `false` (`.env.example` L129) | `apps/api/src/media/media.service.ts` | T12/T19.2 |

**Consolidation guard:** `apps/api/src/config/phase4-flag-matrix.spec.ts` asserts Phase 4 monetisation flags default off in `loadApiConfig` and `.env.example`.

---

## 5. Stripe configuration

### 5.1 Boost Price ID keys — exist but empty

| Key | `.env.example` | Schema | Read site |
|-----|----------------|--------|-----------|
| `STRIPE_PRICE_BOOST_7D` | L146 (empty) | `apps/api/src/config/load.ts` L283 | `apps/api/src/billing/stripe.service.ts` L107 |
| `STRIPE_PRICE_BOOST_30D` | L147 (empty) | `load.ts` L284 | `stripe.service.ts` L108 |

When empty, checkout uses Stripe `price_data` with flat cents from `packages/shared/src/listing-boost/listingBoost.ts` (990¢ / 7d, 2490¢ / 30d) — `stripe.service.ts` L110–118.

### 5.2 Premium plan seed state

Migration `migration/sql/0061_ecs_t27_seller_subscription.sql` L19–28 inserts:

| Field | Value |
|-------|-------|
| `plans.key` | `seller_premium` |
| `price_cents` | 1900 (€19.00/mo) |
| `features` | `maxActiveListings:20`, `maxUploadsPerDay:100`, `analyticsWindowDays:365`, `priorityModeration:true` |

Checkout requires `plan.stripePriceId` populated in DB (`stripe.service.ts` L73) — seed SQL does **not** set `stripe_price_id`; **UNVERIFIABLE** whether ops has backfilled Stripe Price ID on VPS DB. Flag `SELLER_PREMIUM_ENABLED=false` blocks checkout regardless.

---

## 6. Promise ledger P1–P8

Source: `apps/web/src/config/sell-privately/promises.json` (updated `2026-08-10`).

| Promise | Ledger state | Live vs coming (page chips) | Remaining blocker |
|---------|--------------|----------------------------|-------------------|
| **P1** Zero commission | `live` (L7) | **Live** — honest at launch | Sustained by T26–T27 when monetisation flags flip; counsel T02 for “gratuito + optional paid” wording |
| **P2** OMI price guidance | `live` (L14) | **Live** — T08+T09 merged | None (engineering) |
| **P3** Verified Owner | `coming` (L22) | **Coming** | **Counsel:** T05 §6.3 + flip `VERIFIED_OWNER_ENABLED`; T14–T17 code ready |
| **P4** Verified buyers | `live` (L32) | **Live** (buyer-side EC-1) | Seller inbox half-done (T20 API only); **build:** web inbox UI |
| **P5** Viewing scheduler | `live` (L39) | **Live** (EC-3–7 core) | Seller-conducted path built (T21) but **ops:** `SELLER_VIEWINGS_ENABLED` + G1 |
| **P6** Document checklist | `coming` (L50) | **Coming** | **Counsel** + `SELLER_CHECKLIST_ENABLED`; T18 code ready |
| **P7** Seller dashboard analytics | `coming` (L57) | **Coming** | **Ops:** `SELLER_ANALYTICS_ENABLED` + G3/G4; T23/T24 code ready; ledger flip not done per `docs/audits/EC-S-phase3-completion-feedback.md` |
| **P8** Control & data protection | `live` (L64) | **Live** (baseline) | **Counsel:** T05 Layer 1 → set `INFORMATIVA_SELLER_VERSION`; T25 messaging **not started** |

**Copy blocks (not promises):**

| Block | State | Gate |
|-------|-------|------|
| `savingsFigures` | `fallback` | T02 counsel |
| `mediazioneCopy` | `fallback` | T04 counsel |

---

## 7. i18n coverage

### 7.1 Consent interstitial (`consentUpdate`) — IT / EN / ES

| Locale | Keys | File | Tests |
|--------|------|------|-------|
| IT | 10 keys | `apps/web/messages/it.json` L3372–3383 | `apps/web/src/lib/consent-update-i18n.spec.ts` |
| EN | 10 keys (parity) | `apps/web/messages/en.json` L3372–3383 | Same spec |
| ES | 10 keys (parity) | `apps/web/messages/es.json` L3372–3383 | Same spec |

Component: `apps/web/src/components/seller/SellerConsentUpdate.tsx` (mounted via `apps/web/app/[locale]/seller/layout.tsx`, added T32 PR #129).

**Verdict:** Consent interstitial i18n **DONE** for IT/EN/ES.

### 7.2 Wizard + dashboard ES gaps (T31 scope)

| Namespace | IT keys | EN parity | ES parity | Evidence |
|-----------|---------|-----------|-----------|----------|
| `sellerWizard` | 72 | ✅ | ✅ | `apps/web/src/lib/seller-surfaces-i18n.spec.ts` L151–155 |
| `sellerAnalytics` | 20 | ✅ | ✅ | Same file L170–174 |

**Verdict:** No missing ES namespaces for wizard or analytics dashboard on `main`.

### 7.3 Residual i18n gap (outside T31 scope)

| Namespace | Locales present | Consumer | Gap |
|-----------|-----------------|----------|-----|
| `sellerInbox` | IT/EN/ES — `apps/web/messages/*.json` L283+ | **None** — no `useTranslations('sellerInbox')` in web app | Strings prepared for T20 web UI not yet built; CI copy gate: `scripts/check-seller-inbox-copy.sh` |

---

## 8. Known gaps & risks (ordered)

| # | Gap | Recommended next action |
|---|-----|-------------------------|
| **G7** | `NEXT_PUBLIC_DEMO_MODE` still documented as `true` on VPS → sitewide `noindex`, T33 SEO category FAIL (`docs/audits/T01/REPORT.md` L10; `docs/audits/EC-S-t32-completion-feedback.md` L3) | **Ops:** unset `NEXT_PUBLIC_DEMO_MODE` (or set `false`) in VPS `.env`, rebuild web image per `infra/docker-compose.yml` |
| **G1** | Seller-facing collection / real enablement gated — `SELLER_INBOX_ENABLED=false`; consent UI inert without onboarding + version (`docs/audits/EC-S-phase4-completion-feedback.md` L48) | **Product/ops:** run G1 decision checklist before flipping seller collection flags |
| **Counsel Claims 7–8** | T02 addendum unsigned — blocks `LISTING_BOOST_ENABLED` / `PARTNER_DIRECTORY_ENABLED` label flips (`docs/legal/ec-s-t02-claims-7-8-addendum.md` L31, L49) | **Counsel:** sign Claims 7–8 checkboxes with date/name |
| **Stripe IDs** | `STRIPE_PRICE_BOOST_7D` / `STRIPE_PRICE_BOOST_30D` empty; `seller_premium` seed lacks `stripe_price_id` | **Ops:** create/publish Stripe Price IDs in Dashboard; backfill `plans.stripe_price_id` for `seller_premium` before premium checkout |
| **Sticky “Later” reminder** | “Not now” is session-dismissible only (`SellerConsentUpdate.tsx` L37, L192); API still blocks selling tools — product decision open (`docs/audits/EC-S-t32-completion-feedback.md` L28) | **Product/counsel:** decide if persistent reminder UX is required beyond sessionStorage dismiss |

### Additional risks (not in ordered list above)

| Risk | Evidence | Action |
|------|----------|--------|
| CI red on `main` | `check:seller-hardcoded-strings` failure at `051bcfe` | Fix `SellerListingWizard.tsx` quota i18n + install `rg` in CI or fall back to grep |
| T05 unsigned | Empty `INFORMATIVA_SELLER_VERSION` | Counsel/DPO sign Layer 1 → set version string |
| T19.2 LIA HOLD | Roadmap L19 | Wait for LIA before dup-enforce UX |
| T20 web UI missing | No `seller/inbox` route | Build inbox page consuming existing API + `sellerInbox` i18n |
| T25 not started | Phase 3 feedback | Do not promise in-portal messaging until controllership cleared |

---

## 9. CI state summary

| Workflow | SHA `051bcfe` | Result | URL |
|----------|---------------|--------|-----|
| `api-boot` | ✅ | success | [31533201630](https://github.com/aziz-mubasher/EasyCasa/actions/runs/31533201630) |
| `CI` | ❌ | failure — `check:seller-hardcoded-strings` | [31533201623](https://github.com/aziz-mubasher/EasyCasa/actions/runs/31533201623) |
| `security` | ❌ | failure | [31533201642](https://github.com/aziz-mubasher/EasyCasa/actions/runs/31533201642) |
| `api-integration` | ❌ | failure | [31533201716](https://github.com/aziz-mubasher/EasyCasa/actions/runs/31533201716) |
| `a11y-webvitals` | ❌ | failure | [31572457854](https://github.com/aziz-mubasher/EasyCasa/actions/runs/31572457854) |

Local workspace at audit time: detached at `051bcfe` (matches `main` tip).

---

## 10. UNVERIFIABLE items

| Claim | Reason |
|-------|--------|
| VPS `NEXT_PUBLIC_DEMO_MODE` current value | Production `.env` not in repo; inferred from audit docs only |
| VPS feature-flag runtime values | Same |
| `plans.stripe_price_id` for `seller_premium` on production DB | Requires DB inspection |
| Counsel/DPO sign-off dates for T02/T04/T05 | Legal process outside repo |
| Post–T32 Lighthouse scores on production | T01 pack dated 2026-08-10 (`docs/audits/T01/REPORT.md`); no newer pack in repo |
| Whether PR #129 deploy is live on VPS right now | `/api/version` sha match claimed in `docs/audits/EC-S-t32-completion-feedback.md` but not re-checked in this audit |

---

## 11. Document index

| Doc | Relevance |
|-----|-----------|
| `docs/ec-s-roadmap.md` | Source of truth T01–T33 |
| `docs/audits/EC-S-phase0-completion-feedback.md` | T01–T05 |
| `docs/ec-s-phase1.md` | T06–T12 |
| `docs/audits/EC-S-phase2-completion-feedback.md` | T14–T19 |
| `docs/audits/EC-S-soft-launch-completion-feedback.md` | T13, T19.1 |
| `docs/audits/EC-S-phase3-completion-feedback.md` | T20–T25 |
| `docs/audits/EC-S-phase4-completion-feedback.md` | T26–T31 |
| `docs/audits/EC-S-t32-completion-feedback.md` | T32 PR #129 |
| `docs/audits/EC-S-t33-hold.md` | T33 dispatch brief |
| `docs/audits/T01/REPORT.md` | Lighthouse verification pack |

---

*Report generated for K EC 1.44 — report only, no code changes beyond this document.*
