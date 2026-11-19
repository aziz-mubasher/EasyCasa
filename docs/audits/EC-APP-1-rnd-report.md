# EC-APP-1 — R&D status report (for Claude)

**Audience:** Claude (R&D / next-brief author) + Aziz  
**Date:** 28 September 2026  
**Brief in force:** EC-APP-1 **v1.1** (AZM decisions on accounts, domain, payments, prices)  
**Operator:** Cursor cloud agent  
**Code audited:** `main` @ **`e6342bc`**  
**This report’s PR:** [#246](https://github.com/aziz-mubasher/EasyCasa/pull/246) **DRAFT** on `cursor/ec-app-1-census-68f4`  
**Full census:** `docs/ec-app-1-census.md`  
**T04:** this status does not implement rows 10–12. The brief correctly removes in-app offers. Do not brief them back in.  
**Corporate state in code:** `CORPORATE_STATE = 'PONTE'` (`packages/shared/src/corporate-state.ts`).  
**Bridge:** no `task_<hex>` was supplied. Ledger key is `EC-APP-1`, `bridgeTaskId: null`.

> **Status in one line:** PR 0 (read-only census) is written and in draft PR #246. No app code has changed. Do not dispatch PRs 1–6 as one task. The unsigned payments webhook is an API defect and is not fixed.

---

## Operator summary (forwardable)

| Piece | Status | Notes |
| --- | --- | --- |
| PR 0 census | **DRAFT** | [#246](https://github.com/aziz-mubasher/EasyCasa/pull/246). English. No app/API/catalog edits. |
| PRs 1–6 (upgrade, removals, shells, screens, store) | **NOT STARTED** | Brief orders them after this census. |
| Expo SDK | **51.0.28 / RN 0.74.5** | `newArchEnabled: false`. Below the store bar the brief describes (Xcode 26 / API 36). SDK 55 vs 56 was **not** chosen. |
| Design files named in the brief | **NOT IN THE REPO** | The four `claude/AZM_EC_*.md` files and the canvas are absent. Screen copy cannot be built from them. |
| Unsigned `POST /payments/webhook` | **OPEN API DEFECT** | Accepted when `PAYMENTS_ENABLED` is false. That is the boot default. Live VPS flag was **not** re-read. |
| Seller phone on public listing | **LEAK ON SLUG** | UUID detail has no phone. Non-UUID `GET /listings/:slug` returns `agent.phone`. |
| `easycasa.it` in `app.json` | **STILL PRESENT** | v1.1 says remove it in **PR 1**. Not removed here. |
| `app.easycasaita.com` | **DOES NOT RESOLVE** | No DNS on 28 Sep 2026. Apex and `www` do resolve. `extra.webAppUrl` points at the missing host. |
| In-app payments | **STILL IN THE TREE** | v1.1 says they leave the v1 bundle. Not removed in PR 0. |
| §5 API gaps | **TICKETED, NOT BUILT** | One ticket per rule below. Do not hide them inside an app PR. |
| Kaizen / Startup boards | **NOT UPDATED** | Brief gave no category and no phase 1–6. |
| AASA / `assetlinks.json` | **NOT IN THE TREE** | `docs/phase-7.md` checks them off. The files are not there. |

---

## What shipped in this turn

Documentation only:

- `docs/ec-app-1-census.md` — fact check of brief §2, what the out-of-design routes do, and whether each §5 rule already exists on the API.
- `docs/audits/EC-APP-1-rnd-report.md` — this file.
- Ledger: `docs/azm-deliverables/EC-APP-1/STATUS.json` and `docs/azm-deliverables/_bridge/status-ledger.json`.

`pnpm lint` / `typecheck` / `test` were not run. No TypeScript changed.

---

## §2 fact check (do not brief the false ones again)

| # | Brief | Repo |
| --- | --- | --- |
| 1 | Expo `~51.0.28`, RN `0.74.5`, maps `1.14.0`, `newArchEnabled: false`, bundle `it.easycasa.app` | **True.** |
| 2 | Design tokens still azure `#1e5ae0` / paper `#f5f4ef` / ink `#16233b`; web is ink `#14212e`, paper `#f3ede1`, azure `#2c6e9b`, ochre `#c08a1e` | **True.** Mobile theme reads the package, so the app shows the old colours. |
| 3 | `easycasa.it` is in associated domains | **True.** v1.1 decision: only `easycasaita.com`. Removal is PR 1. |
| 4a | DEV webhook path is absent from the production build | **False.** `apps/mobile/src/payments/confirm.ts` has no `__DEV__` guard. The `dev_secret_` branch is always compiled. It runs only if the secret has that prefix. |
| 4b | Production API always rejects an unsigned webhook | **False as a property of the code.** `POST /payments/webhook` is `@Public()`. Stripe signature is required only when `PAYMENTS_ENABLED` is true (`apps/api/src/payments/payments.controller.ts`). Default in `apps/api/src/config/load.ts` is `false`. Audit `docs/legal/AYNI_STATE_AUDIT.md` (2026-09-07) claims the VPS flag was `true`. This agent did not read the VPS `.env`. |

**API ticket, not an app PR:** do not mount the unsigned webhook, including when `PAYMENTS_ENABLED` is false.

---

## v1.1 decisions (closed — do not re-ask)

| Decision | Consequence for the next brief |
| --- | --- |
| Personal Apple and Play accounts | Store seller is a person. Privacy notice must name the real controller. PR 6 writes a transfer runbook for a later organisation account. Play production is blocked until a **closed test with 12 testers for 14 consecutive days**. |
| Only domain `easycasaita.com` | PR 1 deletes `applinks:easycasa.it`, `applinks:www.easycasa.it`, and the `easycasa.it` intent filter. |
| No payment system in v1 | No SDK, no Apple Pay / Google Pay, no payment link, no checkout WebView. Drop `checkout.tsx`, `src/payments/confirm.ts`, `src/api/billing.tsx` and their imports. CI: zero `stripe`, `paymentSheet`, `confirmPayment`, `createIntent` under `apps/mobile`. |
| Example prices €149 and €99 / 90 days | Design only. **Do not put them in message files.** Price comes from the catalog. Real prices are still open. |

Still open for AZM, not for a coding brief:

1. Who the 12 Play testers are, and who recruits them.
2. Work address or PO box, and phone, published as the App Store trader. Brief names `info@easycasaita.com`.
3. Real catalog prices, when EC-PRICING-1 sets them.
4. Whether the live VPS has `PAYMENTS_ENABLED=true`.

---

## Routes the design v1 does not include

| Route | What it does today | v1 fate |
| --- | --- | --- |
| `(owner)/[propertyId]/checkout.tsx` | Order, invoice preview, `purpose: 'DUE_NOW'`, then a 6-month mandate. Signer email is hardcoded `owner@easycasaita.com`. | **Out of the bundle** (v1.1 §8). |
| `(owner)/[propertyId]/lease.tsx` | Lease form (`LIBERO_4_4`, `CONCORDATO_3_2`, `TRANSITORIO`, `STUDENTI`) and RLI payload. | Not in the design. Not deleted. Needs a product decision. |
| `(owner)/[propertyId]/services.tsx` | Catalog + packages, quote, navigates to checkout. `ServiceItemRow` still has a `priceModel === 'provvigione'` branch. | UI branch must die with §3. Server already hides provvigione rows while `PONTE`. |
| `(owner)/valuation.tsx` | AVM estimate. Coordinates hardcoded to Milan (`45.4642`, `9.19`). Rounds to the nearest thousand and paints a confidence colour. | Not an OMI fact band. Not in the design. Not deleted. |
| `(pro)/` | Assignment inbox and credentials. | Out of the consumer bundle (brief §3). |

`fascicolo.tsx` **is** screen 12. Today it is a document checklist and upload. It does not say “pay on delivery”.

---

## §5 — API support (one ticket each; do not build these inside app PRs)

| Rule | Supported today? | Ticket |
| --- | --- | --- |
| M1 seller phone never reaches the buyer app | **No** on the slug branch of `GET /listings/:slug` (`publicAgentFor` returns `phone`). **Yes** on UUID detail and on `viewingForSeeker`. | `EC-APP-1-API-M1` |
| M1 message forwarded as written | Thread stores the body (trim, max 2000). Push `enquiry.new` slices to 200 characters. `isLikelySpam` can drop it. No “reveal my number” endpoint. | same M1 |
| M2 declaration fields (agent, REA, for whom, timing, payment, read class and index) | **Absent.** `CreateEnquiryDto` is intent, message, email, phone, WhatsApp, Banks4All token. `intent` still includes `'offer'`. | `EC-APP-1-API-M2` |
| M3 seller-written rule, order only, shown on the listing | **Absent.** | `EC-APP-1-API-M3` |
| V1 published weekly windows | **Present.** `POST /listings/:id/availability`, public `GET /listings/:id/slots`. | — |
| V2 identity before confirm | **Absent.** `BookDto` is `{ startMs, enquiryId? }`. `phone-verify` is not wired to confirm. | `EC-APP-1-API-V2` |
| V7 safety conditions as booking constraints | **Absent.** | `EC-APP-1-API-V7` |
| No viewing outcome | **Fail.** Status enum includes `COMPLETED` and `NO_SHOW`, with `POST /viewings/:id/complete` and `no-show`. Mobile does not read them. A schema test would fail. | `EC-APP-1-API-VISIT-STATUS` |
| Energy class and index on every card the client can receive | **Partial.** `publish` calls `assertEnergyAdvertComplete` (400 if either is missing). Search pins have nullable class and **no index**. Detail still returns incomplete rows. | `EC-APP-1-API-R4-READ` |
| OMI as band / zone / semester / source, never a judgement | **Fail** on the public endpoint. `GET /listings/:slug/valuation-band` returns `fairMarket`, `outOfMarket`, and `side: below \| in_band \| above`. | `EC-APP-1-API-OMI-FACT` |
| Tier 3: seller picks an enrolled agent (REA + VAT), no platform fee, no recommendation | **Absent.** `VIEWING_ACCOMPANIMENT` exists in catalog source at 4900 cents and is `active: false`. That is not tier 3. | `EC-APP-1-API-TIER3` |

Already true, do not rebuild:

- While `PONTE`, `publicCatalog()` drops `priceModel === 'provvigione'`.
- `VIEWING_ACCOMPANIMENT`, `FULL_MEDIATION`, `BUYER_MEDIATION`, `OFFER_DRAFTING` are `active: false`.
- A `PONTE` quote throws on a provvigione line.
- Seeker viewing projection has no conductor phone. Address appears only when status is `CONFIRMED`.

`[[BUCO: elenco cause di esenzione APE]]` is already in `packages/shared/src/energy-advert.ts`. Do not invent an exemption list.

---

## Where the brief failed

**Wrong**

- “The DEV webhook path does not ship in the production build.” It does.
- “The production API rejects an unsigned webhook” as an unconditional fact. It rejects one only when `PAYMENTS_ENABLED` is true.
- Treating `GET /listings/:slug` as one phone-free contract. UUID and non-UUID are two different JSON shapes on the same route. The mobile client (`EasyCasaListingsApi`) parses only the Phase 21 shape, which has no phone. The slug HTTP body still contains `agent.phone` before that parse.

**Missing**

- The four design markdown files and the canvas. They are not in `aziz-mubasher/EasyCasa`.
- A `task_<hex>`.
- A Kaizen category and a Startup phase. Boards were left alone on purpose.
- DNS for `app.easycasaita.com`. The brief says verify it. It does not exist.

**Over-specified**

- Proposed route table in §4. Fine as a proposal. Do not treat those paths as already created.

---

## Repo reality the next brief must design around

- pnpm monorepo. Web: Next.js. API: NestJS. Mobile: Expo SDK 51, expo-router `~3.5.23`, React 18.2.
- `@easycasa/design-tokens` is a small TS object (`primary`, `primaryDark`, `paper`, `pine`, `clay`, `muted`, `line`, `sand`). It does not export `ink`, `ochre`, `paper-deep`, `azure-pale`, `line-strong`. Web source of truth is `apps/web/app/globals.css`.
- Mobile copy is `apps/mobile/src/i18n/locales/*.json`, not `apps/web/messages/`.
- There is no mobile CI banned-word scan yet. The web scan lives at `apps/web/src/lib/pricing-messages.spec.ts`. PR 2 has to add the mobile one. Do not assume it exists.
- `docs/phase-7.md` marks `apple-app-site-association` and `assetlinks.json` done. They are not files in this tree.
- Store display name in `app.json` is `EasyCasa`. Brief wants `Easy Casa Italia`.
- `NSLocationWhenInUseUsageDescription` is English only. No `locales` block in `app.json`.

---

## Effort

PR 0 was the size the brief implied: a read of the existing app, not a build. PRs 1–6 together are an SDK upgrade, a store binary, two shells, and twelve screens, plus API work the brief itself says is out of scope. Dispatch them separately. The webhook ticket should not wait on the app.

---

## Blocked / needs a human

- AZM: live `PAYMENTS_ENABLED` on the VPS.
- AZM: DNS for `app.easycasaita.com`, or an explicit yes to point `webAppUrl` at `https://easycasaita.com` in PR 1.
- AZM: 12 Play testers.
- AZM: trader postal address and phone.
- AZM: real catalog prices (do not hardcode €149 / €99).
- Counsel, not the product owner: brief §3, §8, §11.
- Boards: a category and a phase, if a card is wanted.

---

## What the next brief should say

1. Put the design markdown in the repo, or stop citing those paths.
2. One brief per API ticket in the table above. The app must not invent M2 fields, the seller rule, identity-before-confirm, or an OMI-fact DTO.
3. PR 1, and only PR 1: remove `easycasa.it`; fix `webAppUrl`; upgrade Expo to the current stable that defaults to the iOS 26 SDK; turn the New Architecture on; target Android API 36; no UI. Name the SDK from the Expo release notes in that PR. This report does not pick 55 or 56.
4. PR 1 must not treat the slug listing endpoint as phone-free. That fix is `EC-APP-1-API-M1`.
5. Supply a `task_<hex>` if the bridge ledger should key on anything other than `EC-APP-1`.
6. Do not ask the app to render a listing that arrives without both energy class and index, and do not ask it to show `—` next to the price. The server read-path filter is `EC-APP-1-API-R4-READ`.
7. Do not reuse `valuation-band` on the listing card. It is a price judgement.

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE

The census matches PR 0: confirm §2, describe checkout / lease / services / valuation, and say which §5 rules the API already supports. v1.1 decisions are recorded and not implemented. No screen was built. `easycasa.it` was not deleted, because v1.1 assigns that to PR 1 and PR 0 is read-only.

### 2. WHERE THE BRIEF FAILED YOU

See “Where the brief failed” above. The load-bearing errors are the webhook (flag-gated, not unconditional) and the two listing JSON shapes.

### 3. REPO REALITY CHECK

See “Repo reality” above. Stack is Expo 51, not a greenfield app. Catalog provvigione rows are already inactive while `PONTE`. The mobile UI branch is still compiled.

### 4. EFFORT SIGNAL

Census matched the brief. The rest of EC-APP-1 is several briefs, not one.

### 5. BLOCKED / NEEDS A HUMAN

See “Blocked” above. Nothing in this report needs a secret from Cursor. The VPS flag, DNS, testers, trader address, and prices need AZM.

### 6. NEXT TASK SHOULD ACCOUNT FOR

See the numbered list above. Ship the design files. Split the API tickets. PR 1 is upgrade + domain + `webAppUrl` only.
