# EC-S Seller Journey — Completion Plan

**Goal:** a private seller completes the entire selling process **self-serve** — discover → onboard → list → verify → enquiries → viewings → analytics → pay → close — with zero operator intervention.
**Basis:** SOP (`docs/runbooks/seller-dashboard-sop.md`) known-gaps + post-roadmap state at `main @ b88ec82` / VPS `4879928`.
**Relation to other docs:** extends `docs/ec-s-post-roadmap-polish.md` (adds PP-4/PP-5/V-1; PP/PK numbering continues). Roadmap v2 (T01–T33) itself is COMPLETE — this doc is about closing the **experience**, not the roadmap.
**Repo home:** `docs/ec-s-seller-journey-completion.md`

---

## 1. Journey status map (2026-08-13)

| # | Stage | Surface | Status | Blocker |
|---|-------|---------|--------|---------|
| 1 | Discover | `/vendi-da-privato` (IT/EN/ES), Claim 1–2 live, T33 SEO | ✅ LIVE | — |
| 2 | Sign up + onboard | OIDC + `POST /seller/onboarding` + informativa v1.1 | ⚠️ **API-only** | **PP-4** (no web form — funnel's broken first mile) |
| 3 | Create listing | `/seller/list` wizard: OMI panel, photos, AI description, autosave, publish, quotas | ✅ LIVE | — |
| 4 | Prove genuineness | VO upload + moderation + checklist + trust badges | ⛔ DARK | PK-1/PK-2 flips **+ PP-6** (no seller VO/checklist UI) |
| 5 | Receive enquiries | `/seller/enquiries`, Verified Buyer badges, mark-read | ✅ LIVE | (chat = T25, parked PK-5 — by design off-platform for now) |
| 6 | Conduct viewings | availability + open-house + `/seller/viewings` | ❓ UNVERIFIED | **V-1** (confirm `SELLER_VIEWINGS_ENABLED` on VPS) |
| 7 | Steer the sale | analytics + price nudges | ⛔ DARK | PK-3 flip |
| 8 | Pay us | boost + premium (Stripe rails live, flags on) | ⚠️ **No UI** | **PP-5** (no buy button / upsell surface — monetisation unsellable) |
| 9 | Close | off-platform via partner directory (portal, not mediatore) | ✅ LIVE (by design) | PK-8 seeding for paid rows |

**Self-serve today:** stages 1, 3, 5 (+9). **Definition of done for this plan:** every stage ✅ or an explicit product decision recorded to keep it dark.

## 2. Remaining work

### 2a. Ops verification — do first, 5 minutes

| ID | Action | Owner |
|----|--------|-------|
| **V-1** | On VPS: `printenv SELLER_VIEWINGS_ENABLED` (Traefik-pair exec, SOP §3.2). Record result in SOP flag matrix. If `false` and product wants stage 6 live: runtime flip + api recreate (no web rebuild — pages always render). Smoke: availability edit + buyer booking + seller confirm | AZM |

### 2b. Eng dispatches — in order (one Kaizen code, one agent each)

| ID | Item | Scope | Acceptance | Gate |
|----|------|-------|-----------|------|
| **PP-4** | **Seller onboarding web form** | Web UI for `POST /seller/onboarding` mounted where wizard raises `onboardingRequired`: display name, phone, marketing consent, informativa v1.1 acceptance (reuse T32 consent components). IT/EN/ES via i18n. No new API unless strictly needed | New OIDC user reaches published listing with **zero curl**; `consent.decision=ok`; flag-off still 404s | None — dispatch-ready |
| **PP-5** | **Monetisation purchase UI** | Boost buy button (7/30d) on seller listing cards → `/featured/checkout`; premium upsell surface (quota-429 moment + dashboard) → `/billing/checkout` + `/billing/portal` link; entitlements display from `/seller/entitlements`. T04-compliant wording; no new pricing copy without counsel check | Seller buys boost and premium end-to-end in UI; `In evidenza` label appears; unauth → 401 | None — dispatch-ready; **highest revenue leverage** |
| **PP-6** | **VO + checklist seller UI** (pre-stage dark) | Seller-facing VO document submit + state display (`/seller/vo/*`) and checklist slots + completeness score (`/seller/checklist/*`), behind existing flags (dark until PK-1/PK-2). Web needs no `NEXT_PUBLIC_*` unless a route must 404 dark — if added, Dockerfile ARG + compose build.args in same PR (rule C.2) | Flag-off: invisible. Flag-on (staging): submit → documents_submitted → verified badge visible | None to build; PK-1/PK-2 to light |
| **PP-1** | Partner Stripe self-serve checkout | (unchanged from polish backlog) | — | None |
| **PP-2** | Housekeeping bundle | (unchanged: shared Service helper, service-page i18n, enquiry-card listing titles) | — | None |
| **PP-3** | Static lastmod hygiene | (unchanged) | — | None |

**Suggested dispatch order:** PP-4 → PP-5 → PP-6 → PP-1 → PP-2 (+PP-3 folded into any of them).

### 2c. Product/counsel decisions (unchanged from polish backlog — not eng)

| ID | Decision | Effect on journey |
|----|----------|-------------------|
| PK-1 / PK-2 | VO + checklist flips (after PP-6 merges) | Stage 4 live → P3/P6 ledger flip |
| PK-3 | Analytics flip | Stage 7 live → P7 already live; deepens it |
| PK-4 | Bunny DPA → CDN | Photo delivery performance (non-blocking) |
| PK-5 | T05 §6.5 → T25 messaging | Stage 5 upgrade: enquiries → chat threads |
| PK-6 | LIA → T19.2 dup-enforce | Abuse hardening |
| PK-7 | External counsel countersign | Risk posture on live claims |
| PK-8 | Seed paid partners | Stage 9 paid directory visible |

## 3. Journey definition of done (smoke, run after PP-4 + PP-5 + V-1)

1. Fresh browser, no operator: sign up → onboard via web form → `consent.decision=ok`.
2. Wizard → publish → public slug 200 → listing in sitemap.
3. Second account: enquiry with consents → appears in `/seller/enquiries` with badge.
4. Availability set → buyer books → seller confirms → completes.
5. Boost purchased in UI → `In evidenza` on card; premium purchased → entitlements raised, quota 429 gone.
6. No-script HTML on `/vendi-da-privato` still shows Claim 1 EUR + portal copy.
7. Parked flags still false (VO/checklist/analytics/CDN) unless PK decisions recorded.

## 4. Standing rules

All dispatches follow `docs/ec-s-post-roadmap-polish.md` §C (single agent per code; `NEXT_PUBLIC_*` Docker ARG same-PR; Traefik compose pair; ops-flip vs eng-build stated explicitly; no parked flips bundled; ledger copy only via flip protocol).

---
*Maintained by Claude (R&D coordination). Close V-1 first, then dispatch PP-4. Update the journey map on every merge/flip; fold back into the polish backlog when all stages are ✅ or decided.*
