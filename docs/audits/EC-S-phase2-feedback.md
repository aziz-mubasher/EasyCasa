# EC-S Phase 2 (T14–T19) — Pre-brief R&D Feedback for Claude

**Audience:** Claude (R&D / brief author) + Aziz  
**Scope:** Private Seller Track — **Phase 2 Trust & verification → P3** per `docs/ec-s-roadmap.md`  
**Date:** 2026-08-10  
**Kind:** Kickoff / briefing readiness (Phase 2 **not implemented** yet)  
**Production HEAD at write-up:** `329e963` (VPS `/opt/easycasa-ita`; Phase 1 + T10 CDN soft-gate hotfix live)  
**Prior reports:**  
- Phase 0 completion → `docs/audits/EC-S-phase0-completion-feedback.md`  
- Phase 1 build → `docs/audits/EC-S-phase1-feedback.md` · status → `docs/ec-s-phase1.md`

> **Naming:** Roadmap **Phase 2** = **T14–T19** (Verified Owner, moderation, name match, trust signals, document checklist, abuse).  
> Do **not** confuse with monorepo docs named `docs/phase-2.md` (legacy Core API checklist) or SQL `0004_phase2.sql`.

---

## 1. Executive verdict

Phase 1 foundation is **on `main` and deployed**. Phase 2 can be briefed now, but **must not collect owner documents or flip P3** until human legal gates clear. The repo already has private-doc keys, a fascicolo checklist (agency/property — wrong product surface for P6), `moderation_events`, and admin queue patterns to **reuse as templates** — not as Verified Owner.

| Task | Briefing posture | Repo today |
|------|------------------|------------|
| **T14** Verified Owner upload + state machine | Brief as **new** domain | No VO table / FSM; private `users/{id}/docs/…` keys exist |
| **T15** Moderation queue + admin UI | Brief new queue; cite Identity/Takedown as **UI pattern only** | `moderation_events` write-only; no admin consumer |
| **T16** Owner-name match | Brief as new service | Catasto fields on listings; no name-match / OCR |
| **T17** Listing-card trust signals | Brief after T14 (+T18 for P6 depth) | `ListingCard` / `ListingSummary` have **no** trust fields |
| **T18** Document checklist (P6) | **Do not** “extend fascicolo” blindly | Fascicolo = agency `document_assets` + CLOSE/PUBLISH gates |
| **T19** Abuse controls | Brief policy actions on T12 events | Dupdetect logs only; `IMAGE_DUPDETECT_ENFORCE=false` |

**Ledger (do not flip in Phase 2 briefs until gates pass):** P3=`coming` (T14–T17); P6=`coming` (T18). P2 already `live`. Counsel blocks stay `fallback`.

---

## 2. Phase 1 exit state Phase 2 depends on

### 2.1 Shipped (engineering)

| Dep | Status | Paths / notes |
|-----|--------|---------------|
| T06 | Built, **flag off** | `seller_profile`, `/seller/*` + `SellerOnboardingEnabledGuard` |
| T07 | Machine + draft API | `@easycasa/shared` `listing-wizard`; `listing_draft` |
| T08/T09 | Live; **P2 → live** | `omi_zone_polygons` / `omi_quotes`; OmiPricePanel; CI copy grep |
| T10 | Partial + soft CDN gate | `media/{aa}/{sha}.webp`; Bunny refused when `MEDIA_CDN_ENABLED=false` → **MinIO fallback** (no boot crash) |
| T11 | Live AI route | `POST /ai/v1/listing-description` |
| T12 | Module + Nest hook | `services/ai/app/dupdetect`; kinds `IMAGE_DUPLICATE` / `IMAGE_NEAR_DUPLICATE` |

### 2.2 Explicit leftovers (not Phase 2, but affect flows)

| Item | Why Phase 2 cares |
|------|-------------------|
| **T13** draft publish/unpublish | Still open on roadmap Phase 1 row — badge-after-publish needs a publish path |
| Dedicated seller wizard page | Machine exists; `/add` not fully replaced |
| HEIC + multi-size variants | Masters only today |
| Keycloak realm role `seller` auto-assign | App `users.role` promotion only |
| Claude `phase1/` packages never on VM | Rebuilt from ACs — briefs must target **this** tree |

### 2.3 Production flags (VPS `.env` at write-up)

```
MEDIA_ORIGIN=bunny
MEDIA_CDN_ENABLED=false          # soft gate → MinIO for new writes
SELLER_ONBOARDING_ENABLED=false
IMAGE_DUPDETECT_ENFORCE=false
INFORMATIVA_SELLER_VERSION=      # empty ⇒ refuse seller_profile insert
```

Migration `0049_ecs_phase1_seller_listing.sql` applied on VPS.

---

## 3. BRIEF ADHERENCE (what implementers will do if you brief well)

**Expect implementers to:**

1. **Reuse** private media key pattern `users/{userId}/docs/…` (`buildObjectKey` / `publicUrlForStorageKey`) for T14/T18 originals — never public CDN.
2. **Extend** `moderation_events.kind` vocabulary for VO / abuse — do not invent a parallel audit table without reason; admin already has `admin_audit_log` for privileged views.
3. **Copy UX patterns** from `apps/admin` Identity Review + Listing Takedown (queue, verify/reject, least-privilege view) for T15 — new routes/tables, same admin shell.
4. Keep **P3→live** gated on **T14+T15+T16+T17** together; **P6→live** after T18 (+T17 signals). Nested ledger flip protocol unchanged.
5. Cite **T04 matrix row 7** (Verified Owner / checklist as listing antifraud, not brokerage) and **T05 §6.3** (third-party data in visura) in every T14/T18 AC.
6. Next SQL = **`0050+`**. Do not reuse `0049`.

**Expect deviation if briefs ignore repo names:** agents will invent `verified_owners` / `omi_zones` / overload `kyc_cases` — correct that in the brief.

---

## 4. WHERE PRIOR BRIEFS FAILED YOU (carry into Phase 2)

| Kind | Lesson | Phase 2 action |
|------|--------|----------------|
| **Missing attach** | Claude `phase1/` never reached cloud VM | Paste/attach `phase2/` packages into the agent workspace **or** design ACs against paths below |
| **Wrong schema names** | Brief assumed `omi_zones` | Use real tables: `omi_zone_polygons`, `omi_quotes`, `seller_profile`, `listing_draft`, `moderation_events`, `document_assets` |
| **Migration collision** | `0048` already aste | Spec `0050_ecs_phase2_….sql` explicitly |
| **Proxy / env footgun** | T10 gate crashed prod (`MEDIA_ORIGIN=bunny` + CDN false); first hotfix spread `apiConfig` Proxy → empty ownKeys | Do not `{...apiConfig}`; soft-fail gates preferred over boot throws |
| **Over-specified greenfield** | Fascicolo / identity / AML already exist | Tell agents **which system to reuse vs fork** |

---

## 5. REPO REALITY CHECK (Claude cannot see this)

### 5.1 Stack (unchanged)

pnpm monorepo · Next 14 (`apps/web`) · Nest (`apps/api`) · FastAPI (`services/ai`) · Vite admin (`apps/admin`) · Traefik VPS `/opt/easycasa-ita` · `@easycasa/shared` · Vitest · Conventional Commits.

### 5.2 Naming — use these exact symbols

| Domain | Actual names |
|--------|----------------|
| Seller | Table `seller_profile`; Drizzle `sellerProfile`; API `/seller/me`, `/seller/onboarding`, `/seller/informativa`; columns `user_id`, `display_name`, `phone`, `informativa_version_accepted`, `accepted_at`, `marketing_consent` |
| Drafts | `listing_draft` (`seller_id`, `current_step`, `payload`, `status` ∈ `draft`\|`submitted`) |
| Moderation log | `moderation_events` (`kind`, `listing_id`, `media_id`, `actor_user_id`, `subject_user_id`, `detail`); existing kinds `IMAGE_DUPLICATE`, `IMAGE_NEAR_DUPLICATE` |
| Listing media | Key `media/{2hex}/{64hex}.webp`; cols `sha256`, `dhash`, `phash`, `dhash_bucket`, `owner_user_id`, `moderation_flag` (column exists; **not set** on dup path today) |
| Private docs | Key prefix **`users/{id}/docs/...`**; URL via private base / `GET /media/file/*` |
| Fascicolo (agency) | `document_assets.type_code` = `APE` \| `ATTO_PROVENIENZA` \| `VISURA_CATASTALE` \| `PLANIMETRIA_CATASTALE` \| …; gates `PUBLISH` / `CLOSE` / `REGISTER_LEASE` |
| Person identity | `identity_review_requests`; `users.identity_verified_at` — **≠** Verified Owner |
| DSA | `listing_reports` |
| AML | `kyc_cases` — **≠** VO |
| Pro creds | `verification_status` enum — professionals only |
| Catasto on listing | `listings.foglio` / `particella` / `subalterno` |
| Env | `SELLER_ONBOARDING_ENABLED`, `INFORMATIVA_SELLER_VERSION`, `MEDIA_CDN_ENABLED`, `MEDIA_PRIVATE_BASE`, `IMAGE_DUPDETECT_ENFORCE` |
| Ledger | `promises.P3`, `promises.P6`; tasks `T14`…`T19`; chip from ledger state |

### 5.3 Already exists — reuse map

| Asset | Path | Phase 2 use |
|-------|------|-------------|
| Private key builder | `apps/api/src/uploads/domain/keys.ts` | T14/T18 storage keys |
| Object storage + CDN soft gate | `apps/api/src/media/object-storage.ts` | Keep private docs off Bunny CDN |
| User-doc presign | `MediaService.presignForUser` | **Throws if Bunny origin active** — VO docs must stay MinIO-capable |
| Dupdetect + event writer | `dupdetect.client.ts` / `recordModerationEvent` | T19 input stream |
| Fascicolo engine | `apps/api/src/fascicolo/` | **Reference** document codes / verify UX — fork product model for P6 seller checklist |
| Fascicolo UI | `apps/web/src/components/owner/FascicoloWizard.tsx` | Pattern only |
| Admin Identity Review | `apps/admin/src/pages/IdentityReview.tsx` | T15 queue UX template |
| Admin Takedown | `apps/admin/src/pages/ListingTakedown.tsx` | Report / decision UX template |
| Admin roles | `apps/admin/src/auth/roles.ts` | New capability for VO moderators — do not overload `aml` |
| T05 memo | `docs/legal/ec-s-t05-seller-data-memo.md` | Retention: verification outcome +12m; originals deleted on account deletion |
| T04 row 7 | `docs/legal/T04_mediazione_boundary.md` | Product framing AC |
| Sell Privately P3/P6 copy | `promises.json` + i18n + `StatusChip` | Stay `coming` until flip protocol |

### 5.4 Gaps (greenfield in brief)

- No `verified_owner*` table / FSM / seller upload UI for visura/atto  
- No admin API/UI that **lists** `moderation_events` or VO cases  
- No owner-name match / OCR service  
- No trust badge fields on listing DTOs / `ListingCard`  
- No private-seller checklist bound to `listing_draft` / EC-S P6  
- No abuse actions (rate-limit, suspend, shadow-ban, media flag set) — events append-only  
- `GET /media/file/*` is `@Public()` — knowing the key serves the object; T05 “never public” needs **authZ**, not only CDN exclusion  

### 5.5 Fragile / ops

- Web image bakes messages + `promises.json` — P3 flip = rebuild web `--no-cache` + force-recreate  
- Prod already `MEDIA_ORIGIN=bunny`; CDN flag false → MinIO fallback for **new** object writes  
- Do not hard-throw on boot for flag combinations (T10 lesson)  
- Alpine native addon compile noise (ssh2/cpu-features) is known noise  

---

## 6. Risky wrong assumptions (reject in briefs)

1. **“Fascicolo IS P6”** — Agency property CLOSE/PUBLISH checklist ≠ private-seller document promise.  
2. **“Admin moderation exists”** — Identity / Takedown / AML ≠ VO queue.  
3. **“KYC / identity_verified = Verified Owner”** — Different laws, roles, tables.  
4. **“Private URL base = authorised”** — Keys on public file route are still fetchable.  
5. **“Bunny stores VO docs today”** — `presignForUser` rejects Bunny origin.  
6. **“Flip P3 when T14 merges”** — Need T14+T15+T16+T17.  
7. **“Seller onboarding is live”** — Built; flag off; no Layer 1 version → no collection.  
8. **“T12 already enforces abuse”** — Flag-only logging.  
9. **“ListingSummary already has trust fields”** — It does not; T17 is API + shared types + card.  
10. **“phase2 packages are in the repo”** — They are not until attached.  

---

## 7. EFFORT / SPLIT RECOMMENDATION

| Slice | Suggested PR | Notes |
|-------|--------------|-------|
| T14 VO FSM + private upload + SQL `0050` | Own PR | Flag-gate collection; no P3 flip |
| T15 admin queue consuming VO + `moderation_events` | Own PR | After T14 schema stable |
| T16 name-match | Own PR or with T14 | Pure logic + tests; OCR optional later |
| T18 seller checklist (P6) | Own PR | Explicitly **not** fascicolo migration |
| T17 trust signals | After T14 (+T18) | DTO + `ListingCard` + i18n chips |
| T19 abuse actions | After T12 calibration | LIA / counsel before enforce |
| Ledger P3/P6 flips | Tiny follow-up PR | Only after validation gates |

**Do not** ship T14–T19 as one mega-PR. **Do not** combine with counsel flips or T20 seller inbox.

**Order:** T05§6.3 + Layer 1 → enable T06 → **T14** → **T15 ∥ T16** → **T18** → **T17** → **T19** (policy) → flip P3/P6.

---

## 8. BLOCKED / NEEDS A HUMAN

1. **Counsel/DPO — T05 Layer 1** signed + version string → `INFORMATIVA_SELLER_VERSION` + `SELLER_ONBOARDING_ENABLED=true` (blocks real T14 collection).  
2. **Counsel/DPO — T05 §6.3** third-party data in visura (explicit T14/T18 ship gate).  
3. **LIA** for Art. 6(1)(f) fraud prevention before T12 enforce + T19 automated actions.  
4. **T04 row 7** counsel confirm on VO/checklist framing.  
5. **T02 Claims 4–5** copy for “Verified Owner” / genuine listings until T15 live.  
6. **Bunny DPA** → `MEDIA_CDN_ENABLED=true` if listing masters stay on Bunny; VO docs still prefer private MinIO.  
7. **Ops:** unset `NEXT_PUBLIC_DEMO_MODE` before T33 SEO claims (carryover).  
8. Attach validated Claude `phase2/` artifacts to the agent workspace if bit-exact packages exist.

---

## 9. NEXT BRIEFS SHOULD ACCOUNT FOR (checklist for Claude)

When writing Phase 2 briefs, each task brief must include:

- [ ] **Depends** checkboxes: T05 Layer 1 / §6.3 / T04 row 7 / T06 flag / T10 private keys / T12 events as applicable  
- [ ] **Repo anchors** with paths from §5.2–5.3 (no invented table names)  
- [ ] **Out of scope:** fascicolo CLOSE gate rewrite; AML `kyc_cases`; person `identity_review`; P3 ledger flip unless all four tasks done  
- [ ] **Storage:** `users/{id}/docs/…`; authZ on read; MinIO for VO even if listing CDN is Bunny  
- [ ] **Admin:** new view + capability; pattern from IdentityReview; EC-11 `@Roles` **above** route decorators  
- [ ] **Acceptance:** flag-gated until counsel; unit tests for FSM transitions; no boot-throwing env gates  
- [ ] **Migration id ≥ 0050**; update `.env.example` + `docs/env.md` for any new flags  
- [ ] **Attach or paste** machine/SQL packages into the cloud workspace  

Suggested first brief: **T14 only** (FSM + upload + SQL + flag), with T15/T16 as follow-on briefs that import T14 types.

---

## 10. One-paragraph summary (forward to Claude)

Phase 2 (T14–T19, Verified Owner → P3) is **not started**. Phase 1 is live on prod `329e963` with seller/OMI/media/dupdetect foundations and flags off. Brief against real names (`seller_profile`, `moderation_events`, `users/…/docs`, fascicolo as **non-P6** agency engine). Do not overload KYC/identity for VO; do not flip P3 until T14–T17 pass; harden private-doc authZ (public file route today); keep VO docs on MinIO even when Bunny CDN is on. Attach `phase2/` packages to the VM. Legal blockers: T05 Layer 1 + §6.3, T04 row 7, LIA for T19.
