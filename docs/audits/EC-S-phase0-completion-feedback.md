# EC-S Phase 0 Completion — R&D Feedback Report

**Audience:** Claude (R&D / brief author) + Aziz  
**Scope:** Private Seller Track — **Phase 0 (Page + compliance)** per `docs/ec-s-roadmap.md`  
**Date:** 2026-08-10  
**Production HEAD at write-up:** `21eb941` (VPS `/opt/easycasa-ita`, web force-recreated)  
**Live URLs:**  
- IT https://easycasaita.com/it/vendi-da-privato  
- EN https://easycasaita.com/en/sell-privately  
- ES https://easycasaita.com/es/vender-entre-particulares  

> **Naming:** Roadmap calls this **Phase 0**. Roadmap **Phase 1** (T06–T13 listing wizard / genuineness) has **not** started. This report is the completion package for the ship-first phase (T01–T05 + T33 partial).

---

## 1. Executive verdict

Phase 0 engineering exit is **met**: Sell Privately page is live in IT/EN/ES with honesty chips driven by a nested promise ledger; counsel-gated EUR figures and “portal not agent” copy stay on **fallback**; counsel packets for T02/T04/T05 are filed and ready for human sign-off. **Blocked on humans:** counsel/DPO decisions and VPS `NEXT_PUBLIC_DEMO_MODE=true` (sitewide `noindex`, blocks T33 SEO Lighthouse category).

| Task | Engineering | Counsel / ops | Notes |
|------|-------------|---------------|-------|
| **T01** Page + footer | ✅ Live | — | Rewrites, SEO alternates, FAQPage+Service JSON-LD |
| **T03** Promise ledger | ✅ Nested schema live | — | Build-time `validateLedger` + Vitest |
| **T02** Savings / claims packet | ✅ Packet shipped | ⛔ Sign-off pending | `blocks.savingsFigures.state=fallback` |
| **T04** Mediazione boundary | ✅ 12-row matrix shipped | ⛔ Sign-off pending | `blocks.mediazioneCopy.state=fallback` |
| **T05** Seller-data memo | ✅ Memo + privacy stub | ⛔ Counsel/DPO pending | Gates T06/T10/T14/T25 |
| **T33** SEO harden | ⚠ Partial | ⛔ Ops: unset DEMO_MODE | Perf ≥90 PASS; SEO category FAIL |

**Phase 0 exit criterion (roadmap):** page live with P1/P8 live, P4/P5 live where EC-1 / EC-3–7 cover them — **met in ledger**. Figures/boundary copy correctly withheld pending counsel.

---

## 2. What shipped (artifact map)

### 2.1 Product / code

| Artifact | Path |
|----------|------|
| Page route | `apps/web/app/[locale]/vendi-da-privato/page.tsx` |
| UI | `apps/web/src/components/services/SellPrivatelyPage.tsx` + `sell-privately.css` |
| Savings slider (gated) | `SellPrivatelySavingsSlider.tsx` |
| Ledger JSON + schema | `apps/web/src/config/sell-privately/promises.json`, `promises.schema.json` |
| Validator (TS) | `apps/web/src/lib/promiseLedger/` |
| Validator (build) | `apps/web/scripts/validate-promise-ledger.mjs` (loaded from `next.config.mjs`) |
| Page adapters | `apps/web/src/lib/sell-privately.ts` |
| i18n | `apps/web/messages/{it,en,es}.json` → `sellPrivately.*` + `footer.sellers.sellPrivately` |
| Locale URLs | Next **rewrites** (not next-intl pathnames): EN `/sell-privately`, ES `/vender-entre-particulares`; legacy ES `/vender-como-particular` → **308** |

### 2.2 Legal / counsel pack

| Artifact | Path |
|----------|------|
| T02 claims packet | `docs/legal/ec-s-t02-counsel-review-packet.md` |
| T04 boundary matrix | `docs/legal/T04_mediazione_boundary.md` |
| T05 seller-data memo | `docs/legal/ec-s-t05-seller-data-memo.md` |
| Privacy stub §9 | `docs/legal/privacy-policy.md` |
| Wired into | `docs/legal/counsel-send-checklist.md`, `COUNSEL-REVIEW-PACKAGE.md` |

### 2.3 Audits / specs

| Artifact | Path |
|----------|------|
| Page spec | `docs/sell-privately.md` |
| Roadmap | `docs/ec-s-roadmap.md` |
| T01 verification | `docs/audits/T01/REPORT.md` + Lighthouse JSON/HTML + `schema-extract.json` |

### 2.4 Merged PRs (Phase 0 chain)

| PR | Title |
|----|-------|
| [#84](https://github.com/aziz-mubasher/EasyCasa/pull/84) | Sell Privately page + ledger (T01) |
| [#86](https://github.com/aziz-mubasher/EasyCasa/pull/86) | T02 interim savings/mediazione gates |
| [#87](https://github.com/aziz-mubasher/EasyCasa/pull/87) | T01 verification pack + promiseLedger |
| [#88](https://github.com/aziz-mubasher/EasyCasa/pull/88) | T02 counsel packet (+ T04 seed) |
| [#90](https://github.com/aziz-mubasher/EasyCasa/pull/90) | T04 full boundary matrix |
| [#91](https://github.com/aziz-mubasher/EasyCasa/pull/91) | T05 seller-data memo |
| [#92](https://github.com/aziz-mubasher/EasyCasa/pull/92) | Nested T03 promise ledger schema |

Follow-up on `main`: `21eb941` restored `footer.sellers.sellPrivately` i18n (build had logged `MISSING_MESSAGE`).

---

## 3. Ledger state at Phase 0 exit

Canonical shape (nested T03):

```json
promises.P* → { state, tasks[], note }
blocks.*   → { state, gate, note }
```

| Id | State | Tasks | Public meaning |
|----|-------|-------|----------------|
| P1 | **live** | T01 | Zero commission at launch |
| P2 | coming | T08, T09 | OMI price guidance |
| P3 | coming | T14–T17 | Verified Owner |
| P4 | **live** | EC-1 | Verified buyers (buyer-side); seller inbox → T20 |
| P5 | **live** | EC-3–7 | Viewing scheduler core; seller-conducted → T21 |
| P6 | coming | T18 | Document checklist |
| P7 | coming | T23 | Seller analytics |
| P8 | **live** | T05, T06 | Control / data — informativa gate still applies for collection |

| Block | State | Gate |
|-------|-------|------|
| `savingsFigures` | **fallback** | T02 |
| `mediazioneCopy` | **fallback** | T04 |

How-it-works chips are **derived** in `getSellPrivatelySteps()` (not ledger rows): `list`→coming; `price`→P2; `verify`→P3; `buyers`→P4; `viewings`→P5.

**Flip protocol (do not weaken):** edit JSON `blocks.*.state` → `live` **and** update `enforceCounselInterim` in `promiseLedger/index.ts`, `validate-promise-ledger.mjs`, and tests — otherwise build/CI fails. Vocabulary is **`live`**, not `full`.

---

## 4. Verification results (T01 pack)

| Check | Result |
|-------|--------|
| Lighthouse mobile Perf ≥90 | **PASS** — IT 91 / EN 93 / ES 93 |
| Lighthouse SEO category | **FAIL** — score 66; `noindex` from `NEXT_PUBLIC_DEMO_MODE=true` |
| hreflang it/en/es + x-default; canonical; sitemap | **PASS** |
| No € figures while savings fallback | **PASS** (body, scripts stripped) |
| Mediazione neutral fallback copy | **PASS** |
| Footer link (home/search) | **PASS** (listing pages omit site footer by design) |
| FAQPage + Service JSON-LD | **PASS** |
| Chip a11y `role="status"` + contrast | **PASS** |
| Hardcoded availability strings | **PASS** (next-intl only) |

Post-deploy spot-check (nested ledger, `21eb941`): IT/EN **200**; “Clear roles…” present; no counsel-gated EUR in stripped body; footer “Sell privately” label present.

---

## 5. R&D FEEDBACK — for Claude

### 5.1 BRIEF ADHERENCE

**Implemented as specified**
- Sell Privately marketing page with brand-first hero, promise chips, how-it-works, FAQ, JSON-LD.
- Honesty mechanic: only ledger-`live` promises advertised; coming chips for the rest.
- Counsel interim: no public €7.500–9.150 / AGCM comparative figures; no strong “portal not agent” claim until sign-off.
- T02 packet, T04 12-row matrix, T05 memo + informativa Layer 1 draft + ship gates.
- Nested ledger schema matching Claude’s target `promises.json` paste (`state`/`tasks`/`note` + nested blocks).

**Deviations (and why)**
1. **Locale routing via Next rewrites**, not next-intl `pathnames` — existing web app pattern; pathnames would have been a larger i18n config change.
2. **How-it-works `steps` not in ledger JSON** — Claude’s nested schema has only P1–P8 + blocks; steps derived in UI adapter so schema stays clean.
3. **T03 package path** `outputs/phase0/T03_promise_ledger/` **never reached the cloud agent VM** — module written from integration notes + later nested paste; may diverge from Claude’s local `promiseLedger.ts` in field naming (`state` vs early flat `status`/`roadmap`).
4. **Gate word is `live`**, not `full` — already used across UI/tests; briefs should say `live`.
5. **Footer i18n key** for Sell Privately was missing at first ship — restored in `21eb941` after VPS build warnings.

**Skipped**
- Flipping any counsel block to `live` (correct — no counsel signature).
- Unsetting `NEXT_PUBLIC_DEMO_MODE` on VPS (ops/secret; not in brief as agent unilateral action).
- Roadmap Phase 1 tasks T06–T13 (out of Phase 0 scope).

### 5.2 WHERE THE BRIEF FAILED YOU

| Kind | Detail | Guess / decision made |
|------|--------|------------------------|
| **Ambiguous** | Flat vs nested ledger | First ship used flat `benefits[]`/`steps[]`; user paste later forced nested migration (PR #92). Next briefs: ship nested shape from day one. |
| **Ambiguous** | Whether how-it-works steps are ledger rows | Kept out of JSON; bound to P2–P5 (+ list fixed `coming`). |
| **Missing** | Full contents of `promises.schema.json` | Wrote draft/2020-12 schema to match `$schema` pointer. |
| **Missing** | Exact IT/EN/ES fallback strings for mediazione | Used neutral “Clear roles / Ruoli chiari / Roles claros” family; confirm against counsel template. |
| **Missing** | ES canonical slug | Chose `/vender-entre-particulares` (verification pack); legacy `/vender-como-particular` 308. |
| **Over-specified** | N/A for Phase 0 legal docs — detail was useful. |
| **Wrong** | Assumption that `phase0/T03_promise_ledger/` would be in the agent workspace | It was not; design blind until paste. |
| **Wrong / tension** | `mediation-disclosure.md` still templates EasyCasa as licensed mediator | Conflicts with T04 portal matrix — counsel must reconcile (called out in T04 doc). |

### 5.3 REPO REALITY CHECK (Claude cannot see the repo)

**Stack**
- pnpm monorepo; **Next.js 14** App Router (`apps/web`); next-intl IT/EN/ES; NestJS API; FastAPI AI; Docker Compose + Traefik on Hostinger VPS `/opt/easycasa-ita`.
- Shared types `@easycasa/shared`; Vitest in web; ESLint; Conventional Commits.
- Brand tokens: ink `#14212E`, parchment `#F3EDE1`, azure `#2C6E9B`, ochre `#C08A1E`; fonts Bricolage / Newsreader / IBM Plex Mono.

**Conventions to respect next brief**
- One feature ≈ one `/docs/<feature>.md` ≈ one PR; run `pnpm lint` / `typecheck` / `test` before finish.
- Prefer Next **rewrites** for marketing locale slugs on this page family.
- Marketing service paths hide site footer (`marketing-service.ts`).
- Ledger flips require deliberate validator/test changes (`enforceCounselInterim`).
- Never commit secrets; VPS `.env` only; update `.env.example` + `docs/env.md` when adding vars.
- Do not edit `/infra` deploy/secret handling unless asked.

**Already exists (briefs often under-used)**
- Buyer verification **EC-1** and viewing stack **EC-3–7** — why P4/P5 are `live` without T20/T21.
- OMI ingestion (prior work) — foundation for T08/T09, not greenfield.
- Global counsel package `COUNSEL-REVIEW-PACKAGE.md`, Contatta informativa lesson (version before collect).
- CRM / WhatsApp / Banks4All cross-controller questions — fold into T05 §3 badge/messages decisions.

**Fragile / ops**
- Web image **bakes** messages + `promises.json` — deploy = `git pull` + `docker compose build web` (+ `--no-cache` when honesty/copy changes) + `--force-recreate --no-deps web`.
- `NEXT_PUBLIC_DEMO_MODE=true` → sitewide `noindex` (T33 blocker).
- Alpine Docker build noise: native addons (ssh2/cpu-features) fail compile but install continues — known, not Phase 0-specific.

### 5.4 EFFORT SIGNAL

| Slice | vs brief | Note |
|-------|----------|------|
| T01 page | ≈ as scoped | Larger once SEO/rewrites/footer/chips included |
| T02 interim gates | Small code, high value | Should have been in T01 brief as hard gate |
| T01 verification pack | Larger than “screenshot QA” | Lighthouse + schema + a11y + live HTML assertions |
| T02/T04/T05 docs | Correctly scoped as doc PRs | T04 matrix was the right depth |
| Nested T03 migration | Larger than “drop JSON” | Touched validators, adapters, tests, counsel docs |

**Split recommendation:** keep **page**, **ledger**, **counsel packets**, and **verification** as separate PRs (as done). Do **not** combine T06 onboarding with leftover Phase 0 counsel waiting.

### 5.5 BLOCKED / NEEDS A HUMAN (Aziz / counsel / DPO)

1. **Counsel sign-off T02** — Claim 1 savings figures; Claims 3–5 as listed in packet; flip `savingsFigures` only if approved.
2. **Counsel sign-off T04** — 12-row matrix + Claim 2 copy; reconcile with `mediation-disclosure.md`.
3. **Counsel/DPO sign-off T05** — bases, retention, controllership (§3), Bunny DPA before T10, Layer 1 version into consent ledger (T30) before T06 collection.
4. **Ops:** unset `NEXT_PUBLIC_DEMO_MODE` on VPS (or set false) and rebuild web to clear sitewide `noindex` / close T33 SEO.
5. **Optional:** confirm ES slug marketing preference forever `/vender-entre-particulares`.

### 5.6 NEXT TASK SHOULD ACCOUNT FOR

1. **Do not start T06** until T05 Layer 1 is approved + versioned (Contatta lesson).
2. **T08/T09** can assume OMI data pipeline exists; brief the **wizard UI binding**, not “invent OMI.”
3. **T04 matrix is the acceptance criterion for T20–T29** — every feature brief must cite the row number and verdict.
4. Ledger SoT is **nested** `promises.P*` + `blocks.*.state`; reference those paths in briefs, not flat `benefits[]`.
5. If listing wizard (T07/T13) needs its own honesty chip, **add a P\*** or extend `HOW_IT_WORKS_STEPS` — do not reintroduce flat `steps[]` in JSON without schema change.
6. Attach or paste any `outputs/phase0/*` packages into the agent workspace; local Mac Claude paths are invisible to cloud agents.
7. Footer / nav i18n keys must ship in the **same PR** as the link.
8. Roadmap **Phase 1** = T06–T13 (listing creation & genuineness → P2, P6, parts of P3). Suggested order after counsel: T06 → T07 → T13, parallel T08/T09 when OMI ready, T10 after Bunny DPA.

---

## 6. Phase boundary — what “done” does and does not mean

**Done (Phase 0 engineering)**
- Public page + honesty ledger + interim legal-safe copy.
- Counsel-ready packets for money claims, mediazione boundary, seller data.

**Not done (explicit)**
- Counsel/DPO signatures.
- Any `blocks.*.state = live` flips.
- Seller onboarding, listing wizard, OMI panel, photo pipeline (Phase 1).
- Seller inbox / conductor viewings / analytics (Phase 3).
- T33 SEO category green (ops DEMO_MODE).

---

## 7. Suggested Claude brief for “Phase 1 kickoff” (T06 first)

When writing the next brief, include:
- **Depends:** T05 sign-off checklist items that must be ☐ before merge.
- **Repo anchors:** Keycloak realm path, existing user/profile tables, Contatta consent-ledger pattern for T30 alignment.
- **Out of scope:** savings/mediazione copy flips; those stay on counsel flip protocol.
- **Acceptance:** no new seller PII fields without versioned Layer 1 string; tests for acceptance gate; no Bunny CDN until DPA box checked in T05 §4.

---

## 8. One-paragraph summary (forward to Claude)

Phase 0 of EasyCasa Private Seller Track is **engineering-complete and live**: nested promise ledger, Sell Privately page in three locales, verification pack (Perf ≥90, SEO blocked by DEMO_MODE), and counsel packets T02/T04/T05 filed. Deviations: rewrites instead of next-intl pathnames; how-it-works steps derived not ledgered; T03 package file never reached the VM so ledger was rebuilt then migrated to your nested schema. **Do not brief T06 until T05 is signed;** cite T04 matrix rows for any seller-tool feature; keep gate vocabulary `live|fallback|hidden`; unset VPS DEMO_MODE before claiming T33 SEO done.
