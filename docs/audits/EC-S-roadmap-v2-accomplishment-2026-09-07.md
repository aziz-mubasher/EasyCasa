# EC-S Roadmap v2 — accomplishment report (for Cursor)

**Audience:** Cursor agents (do not re-implement closed work).  
**Date:** 2026-09-07  
**Repo tip audited:** `4fcff89` (`main`)  
**Source file the user named:** `EC-Sellers_Roadmap_v2.md` — **that filename does not exist.** The live v2 roadmap is:

- **Canonical:** [`docs/ec-s-roadmap.md`](../ec-s-roadmap.md) — title *EC-S Roadmap v2 — Private Seller Track* (T01–T33)
- **Page spec:** [`docs/sell-privately.md`](../sell-privately.md)
- **Ledger:** `apps/web/src/config/sell-privately/promises.json`
- **Post-roadmap polish / parked:** [`docs/ec-s-post-roadmap-polish.md`](../ec-s-post-roadmap-polish.md)
- **Self-serve journey:** [`docs/ec-s-seller-journey-completion.md`](../ec-s-seller-journey-completion.md)
- **Last live sweep:** [`docs/audits/EC-S-closeout-2026-08-15.md`](./EC-S-closeout-2026-08-15.md) + [`docs/audits/EC-S-vo-dpa-cite-rnd-report.md`](./EC-S-vo-dpa-cite-rnd-report.md)

**Method:** code + migrations + ledger + later audits on current `main`. This session did **not** re-probe the VPS. Production flag values below are **last verified 2026-08-15** unless marked otherwise.

---

## 0. One-line verdict

**Roadmap v2 (T01–T33) is engineering-complete and was marked COMPLETE on `main` at `b88ec82` (2026-08-13).** The later polish (PP-1–PP-6) and parked gates (PK-1–PK-8, V-1) also shipped. **Do not open a new T01–T33 implementation PR.** Remaining work is residual honesty / ops / board hygiene — not missing roadmap features.

---

## 1. Do not rebuild (closed surfaces)

If a brief asks to “build the seller track”, “inbox”, “VO”, “messaging”, “boost”, or “T25”, the code **already exists**. Confirm the brief is residual work, not a re-dispatch of a closed Kaizen.

| Surface | Already on `main` |
|---------|-------------------|
| Sell-privately page + ledger chips | `apps/web/app/[locale]/vendi-da-privato/page.tsx`, `promises.json` |
| Seller onboarding (API + web form) | `apps/api/src/seller/`, `apps/web/app/[locale]/seller/onboarding/` |
| Listing wizard + OMI + AI copy + publish | `SellerListingWizard.tsx`, `apps/api/src/listing-drafts/`, `apps/api/src/omi/` |
| Photo pipeline + dup-detect + admin suspend | `apps/api/src/media/`, `services/ai/app/dupdetect/`, `apps/admin/src/pages/AbuseControls.tsx` |
| Verified Owner FSM + admin queue + seller UI | `apps/api/src/verified-owner/`, `apps/admin/src/pages/VoModeration.tsx`, `SellerVerifiedOwnerPanel.tsx` |
| Checklist | `apps/api/src/seller-checklist/`, `SellerChecklistPanel.tsx` |
| Enquiry inbox + in-portal thread (T20/T25) | `/seller/enquiries`, `SellerInboxPanel.tsx`, `apps/api/src/enquiry-messaging/` |
| Seller-conducted viewings + open house | `/seller/viewings`, migration `0056` |
| Analytics + nudges | `/seller/listings/[id]/analytics`, `apps/api/src/nudges/` |
| Boost + premium Stripe | `apps/api/src/listing-boost/`, `SellerBoostActions.tsx`, `SellerPremiumPanel.tsx` |
| Partner directory + self-serve checkout | `apps/api/src/partner-directory/`, migration `0063`/`0064`/`0070` |
| Consent ledger | migration `0060`, `SellerConsentUpdate.tsx` |
| JSON-LD / sitemap (T33) | `packages/shared/src/structured-data/`, `apps/web/src/components/JsonLdScript.tsx` |

---

## 2. Scoreboard (current, not the 2026-08-12 audit)

`docs/azm-deliverables/EC-S-status/EC-S-EXECUTION-STATUS.md` (K EC 1.44, 2026-08-12) is **STALE**. It still says T25 not started, T20 web UI missing, T33 unwired, T19.2 not started. **Ignore it for dispatch.** Use this table.

| Status | Count | Meaning |
|--------|------:|---------|
| **DONE (eng + later enablement)** | 33 / 33 | T01–T33 code on `main`; parked items that were HOLD on 12 Aug later shipped |
| **Counsel residual** | T02 / T04 / T05 / PK-7 | Packets exist; **AZM product-owner** signed live copy. External counsel countersign **deferred** (`CLAUDE.md` §4 — do not collapse `signedBy: AZM` into counsel) |
| **Optional follow-ons** | 3 | P7 empty-state copy; Bunny purge-on-erase; genuine third-party partners |

### Promise ledger (`promises.json`, `updatedAt: 2026-08-15`)

| Id | State | Notes |
|----|-------|-------|
| P1 Zero commission | **live** | Launch claim; sustained by T26–T27 |
| P2 OMI guidance | **live** | T08+T09 |
| P3 Verified Owner | **live** | PK-1 2026-08-15; staffed Ibrahim / Silvana |
| P4 Verified buyers | **live** | EC-1 + seller inbox T20 |
| P5 Viewings | **live** | EC-3–7 + seller-conducted T21/T22; V-1 smoke PASS |
| P6 Checklist | **live** | PK-2 |
| P7 Analytics | **live** | PK-3 — **technically live, sparse for most listings** (see §5) |
| P8 Control & data | **live** | Informativa gate; T25 shipped later |
| `savingsFigures` | **live** | Claim 1 (AZM 2026-08-13) |
| `mediazioneCopy` | **live** | Claim 2 (AZM 2026-08-13) — portal framing |

---

## 3. T01–T33 — what shipped

Status key: **DONE** = code on `main` (this tip). **VPS** = last documented production enablement (2026-08-15). `.env.example` still defaults flags **false** on purpose (safe local/CI).

### Phase 0 — page + compliance

| # | Task | Status | Evidence |
|---|------|--------|----------|
| **T01** | “Vendi da privato” + footer | **DONE** | `apps/web/app/[locale]/vendi-da-privato/page.tsx`; footer “Per chi vende”; IT/EN/ES slugs |
| **T02** | Counsel: savings / commission / B4A / mediazione | **DONE (AZM)** · external counsel deferred | Packets `docs/legal/ec-s-t02-*`; Claim 1 live in ledger |
| **T03** | Promise ledger + chips | **DONE** | `promises.json` + schema; Next build validates ledger |
| **T04** | Mediazione boundary | **DONE (AZM)** · external counsel deferred | `docs/legal/T04_mediazione_boundary.md`; Claim 2 live |
| **T05** | Seller-data memo + informativa | **DONE (AZM / DPO residual)** | `docs/legal/ec-s-t05-seller-data-memo.md`; VPS `INFORMATIVA_SELLER_VERSION=v1.1` (last known) |

### Phase 1 — listing creation & genuineness

| # | Task | Status | Evidence |
|---|------|--------|----------|
| **T06** | Seller role + onboarding | **DONE** · VPS on | Migration `0049`; `apps/api/src/seller/`; web form PP-4 `/seller/onboarding` |
| **T07** | Guided listing wizard | **DONE** | `packages/shared/src/listing-wizard/`; `SellerListingWizard.tsx`; `/seller/list` |
| **T08** | Address → OMI zone | **DONE** | `apps/api/src/omi/` |
| **T09** | OMI pricing panel | **DONE** | `OmiPricePanel.tsx`; P2 live |
| **T10** | Photo EXIF → MinIO → CDN | **DONE** · CDN VPS on | EXIF/WebP/keys in `media.service.ts`; PK-4 `MEDIA_CDN_ENABLED`; private `users/` stay MinIO |
| **T11** | AI description IT/EN | **DONE** | `services/ai/app/routers/listing_description.py` |
| **T12** | Dup / scraped-image detect | **DONE** | `services/ai/app/dupdetect/`; Nest hook in media |
| **T13** | Draft autosave + publish | **DONE** | Migration `0054` |

### Phase 2 — trust & verification

| # | Task | Status | Evidence |
|---|------|--------|----------|
| **T14** | Verified Owner upload + FSM | **DONE** · VPS on | Migration `0052`; `apps/api/src/verified-owner/` |
| **T15** | Moderation queue + admin UI | **DONE** | `apps/admin/src/pages/VoModeration.tsx` |
| **T16** | Owner-name match | **DONE** | `ownerNameMatch.spec.ts` |
| **T17** | Listing-card trust signals | **DONE** | `ListingCard.tsx` + trust i18n |
| **T18** | Document checklist | **DONE** · VPS on | Migration `0053`; `SellerChecklistPanel.tsx` |
| **T19** | Abuse controls (stage 1) | **DONE** | Admin abuse + env knobs |
| **T19.1** | Hard 429 quota | **DONE** | `apps/api/src/seller-quota/` |
| **T19.2** | Dup-enforce + suspend | **DONE** (was HOLD) | PK-6: `IMAGE_DUPDETECT_ENFORCE`; `POST /admin/abuse/users/:id/suspend\|unsuspend`; `AbuseControls.tsx` |

### Phase 3 — seller dashboard

| # | Task | Status | Evidence |
|---|------|--------|----------|
| **T20** | Enquiry inbox + Verified Buyer badge | **DONE** | Migration `0055`; `/seller/enquiries`; `SellerInboxPanel.tsx` (not `/inbox`) |
| **T21** | Seller-as-conductor viewings | **DONE** · VPS on | `/seller/viewings`; V-1 auth smoke PASS 2026-08-15 |
| **T22** | Open-house mode | **DONE** | Same viewing capacity migration `0056` |
| **T23** | Listing analytics | **DONE** · VPS on | Migration `0057`; `/seller/listings/[id]/analytics` |
| **T24** | Price-adjustment nudges | **DONE** | Migration `0058`; `apps/api/src/nudges/` |
| **T25** | In-portal messaging | **DONE** (was HOLD) | PK-5: `enquiry-messaging`; `GET/POST /enquiries/:id/messages`; composer gated on `messagingEnabled` |

### Phase 4 — monetisation + cross-cutting

| # | Task | Status | Evidence |
|---|------|--------|----------|
| **T26** | Featured / boost (Stripe) | **DONE** · VPS on | Migration `0062`; `SellerBoostActions.tsx` |
| **T27** | Premium seller tier | **DONE** · VPS on | Migration `0061`; `SellerPremiumPanel.tsx`; entitlements in `seller-quota` |
| **T28** | Partner directory | **DONE** · VPS on | Migrations `0063`/`0064`/`0070`; `/partner-directory` |
| **T29** | Pro media package referral | **DONE** | Informational note with T28 |
| **T30** | Consent-ledger seller consents | **DONE** | Migration `0060`; `SellerConsentGuard` + `SellerConsentUpdate.tsx` |
| **T31** | i18n wizard + dashboard | **DONE** | IT/EN/ES; `scripts/check-seller-hardcoded-strings.sh` |
| **T32** | Consolidation / cross-module tests | **DONE** | PR #129 lineage; `phase4-flag-matrix.spec.ts` |
| **T33** | SEO harden | **DONE** (was HOLD) | `serializeJsonLd` + `JsonLdScript`; FAQPage/Service/RealEstateListing; CI `check:json-ld-escape`; Lighthouse SEO 100 recorded in `docs/audits/EC-S-t33-lighthouse-scores.md` |

---

## 4. After the 33 — polish / parked / journey (also closed)

These are **not** T01–T33. They closed the self-serve experience after the roadmap was declared complete.

| ID | What | Result | PR / record |
|----|------|--------|-------------|
| **PP-4** | Onboarding web form | LIVE | #150 · K EC 1.47 |
| **PP-5** | Boost + premium purchase UI | LIVE | #152 · K EC 1.48 |
| **PP-6** | Seller VO + checklist UI | LIVE (then lit by PK-1/2) | #153 · K EC 1.49 |
| **PP-1** | Partner Stripe self-serve | LIVE; Price `price_1U4dyaD5t2lALalHXqDTLh8k` (€49) | #155 · K EC 1.50 |
| **PP-2 / PP-3** | Housekeeping + lastmod | LIVE | #157 · K EC 1.51 |
| **V-1** | Viewings flag + book/confirm smoke | PASS | `docs/audits/EC-S-v1-viewings-auth-smoke.md` |
| **PK-1** | `VERIFIED_OWNER_ENABLED` → P3 live | LIVE + staffed | #167 · K EC 1.54 ⚠ invented code |
| **PK-2** | `SELLER_CHECKLIST_ENABLED` → P6 live | LIVE | #159 · K EC 1.52 |
| **PK-3** | `SELLER_ANALYTICS_ENABLED` → P7 live | LIVE | #160 · K EC 1.53 |
| **PK-4** | Bunny CDN + DPA | CDN LIVE; DPA **CITED** 2026-08-15 | #169 · K EC 1.55 ⚠ invented code |
| **PK-5** | T25 messaging flag | LIVE | #173 · Kaizen **PENDING Claude** |
| **PK-6** | T19.2 enforce + suspend | LIVE | same #173 · **PENDING Claude** |
| **PK-7** | External counsel countersign | **CLOSED as residual / product-owner sufficient** | land `940145a` · **PENDING Claude** |
| **PK-8** | Seed paid partners | 7 Mundida pilot rows, all `operator_managed` | same land · **PENDING Claude** |
| **K EC 1.56** | Close-out + directory honesty badge | “Gestito da EasyCasa” + pilot note | #174 / #175–#177 |

**Seller journey (self-serve):** discover → onboard → list → verify → enquiries/thread → viewings → analytics → pay → close via directory is **wired**. Stage 7 is sparse-data; stage 9 is pilot-only (no genuine third-party paid partner).

---

## 5. What is *not* accomplished (residuals only)

These are the only honest leftovers. **None of them is a missing T01–T33 task.**

| Residual | Why it is still open | Suggested next brief (if any) |
|----------|----------------------|-------------------------------|
| **P7 empty-state honesty** | Close-out: 92/118 published listings had zero metrics (4-day rollup window). No seller empty-state copy exists in `SellerAnalyticsPanel.tsx` | Optional eng: i18n empty-state explaining early/sparse data. **Do not** revert P7 ledger |
| **Bunny purge-on-erase** | Listing photos on `easycasa1.b-cdn.net`; erasure path is still DB + MinIO. Purge API unwired | Optional eng: Bunny Storage/CDN purge on listing erase. **Do not** invent `cdn.easycasaita.com` |
| **Partner directory inventory** | 7/7 rows are EasyCasa pilot desk (`operatorManaged`) | Outreach / real partners — not an eng rebuild. Empty catalogue banner is correct |
| **First VO case** | `verified_owner_case` was **0** on 2026-08-15. Queue staffed but never exercised live | Ops: Ibrahim / Silvana login to `https://admin.easycasaita.com/#vo` before first submit |
| **Kaizen board codes** | PK-1/PK-4 used invented **K EC 1.54 / 1.55**. PK-5–PK-8 still `PENDING Claude` | Claude/AZM board hygiene only — Cursor must **not** invent codes |
| **External counsel** | Live consumer copy asserts regulatory posture on **AZM product-owner** sign-off. `CLAUDE.md` §4 / §7 still overdue | Human/counsel — not a Cursor feature PR |
| **`.env.example` defaults** | All seller/monetisation flags remain `false` | Correct for repo. Do not “fix” by flipping example defaults to match VPS |

### Last-known VPS flags (2026-08-15 — **UNVERIFIED this session**)

Documented as **true** on production at close-out: `SELLER_ONBOARDING_ENABLED`, `INFORMATIVA_SELLER_VERSION=v1.1`, `SELLER_INBOX_ENABLED` + `NEXT_PUBLIC_SELLER_INBOX_ENABLED`, `SELLER_VIEWINGS_ENABLED`, `SELLER_ANALYTICS_ENABLED`, `VERIFIED_OWNER_ENABLED`, `SELLER_CHECKLIST_ENABLED`, `LISTING_BOOST_ENABLED`, `SELLER_PREMIUM_ENABLED`, `PARTNER_DIRECTORY_ENABLED`, `MEDIA_CDN_ENABLED`, `SELLER_MESSAGING_ENABLED`, `IMAGE_DUPDETECT_ENFORCE`, `NEXT_PUBLIC_DEMO_MODE=false`. Re-verify with Traefik-pair `printenv` before any flip brief.

CDN host (live): `https://easycasa1.b-cdn.net`. Private VO/checklist keys must stay on MinIO / `MEDIA_PRIVATE_BASE`.

---

## 6. Stale docs that will mislead Cursor

| Doc | Trap |
|-----|------|
| `docs/azm-deliverables/EC-S-status/EC-S-EXECUTION-STATUS.md` | 2026-08-12: T25 not started, T20 UI missing, T33 unwired |
| `docs/audits/EC-S-roadmap-update-2026-08-12.md` | Same snapshot; flags all off |
| `docs/audits/EC-S-roadmap-remainings-2026-08-13.md` | T25/T19.2 still HOLD; superseded by polish doc |
| `docs/ec-s-roadmap.md` status delta (pre-this-PR) | Still said T19.2/T25 parked |
| `docs/sell-privately.md` §SEO | Still says T33 blocked by `NEXT_PUBLIC_DEMO_MODE=true` — **false** after G7 + T33 |
| `docs/audits/EC-S-t32-completion-feedback.md` / `EC-S-t33-hold.md` | Historical HOLD; T33 later shipped in #140 |
| `docs/audits/EC-S-k156-closeout-completion-feedback.md` | Says DPA still OPEN — **superseded** by DPA cite #176 / T05 §4 ☑ |

---

## 7. Standing rules for the next EC-S brief

From `docs/ec-s-post-roadmap-polish.md` §C (still in force):

1. One agent per Kaizen code. Never invent a code. Check `docs/azm-deliverables/_bridge/status-ledger.json` + `list_tasks` before claiming “no PR”.
2. New `NEXT_PUBLIC_*` ⇒ same PR updates `apps/web/Dockerfile` ARG **and** `infra/docker-compose.yml` `web.build.args`.
3. VPS recreate always uses the Traefik pair. API flags = runtime recreate; web `NEXT_PUBLIC_*` = `--no-cache` rebuild.
4. Route is `/seller/enquiries` (not `/inbox`). Unauth seller API → 401; flag-off → 404.
5. State **ops flip** vs **eng build**. Never bundle PK ledger flips into polish/copy PRs.
6. T04 rows 10–12, %-of-sale fees, `sanabilità` / generated legal-risk conclusions, unredacted auction debtor PII — **refuse** (`CLAUDE.md` §9).
7. `signedBy: AZM` ≠ `signedBy: counsel`.

---

## 8. Document map (load order)

1. This file — current accomplishment (2026-09-07)
2. `docs/ec-s-roadmap.md` — T01–T33 list (historical, complete)
3. `docs/ec-s-post-roadmap-polish.md` — PP/PK/V closed + standing rules
4. `docs/ec-s-seller-journey-completion.md` — experience stages
5. `docs/runbooks/seller-dashboard.md` — ops SOP
6. `CLAUDE.md` + `docs/legal/T04_mediazione_boundary.md` — legal floor
7. Phase/enablement audits under `docs/audits/EC-S-*` **after** checking the date

---

*Report only. No feature flags, no production probes, no Kaizen invented. T01–T33 must not be re-implemented.*
