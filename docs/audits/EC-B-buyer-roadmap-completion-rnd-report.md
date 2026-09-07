# EC-B — Buyer Promise Roadmap completion — R&D report (for Claude)

**Audience:** Claude (R&D / next-brief author) + Aziz  
**Date:** 2026-09-07  
**Operator:** Cursor cloud agent (`bc-8f45d416-f823-462e-afef-522ac15c61f7`)  
**Repo tip audited:** `origin/main` @ **`4fcff89`** (PR #215 AYNI census)  
**Live page:** https://easycasaita.com/en/for-buyers · IT `/it/for-buyers` · ES `/es/for-buyers`  
**T04 rows this surface touches:** **2** (OMI as data), **4** (viewings), **6** (buyer badge), **7** (VO / genuineness). Do **not** brief rows **10–12**.

> **There is no Buyer Promise Roadmap in this repo or on the AZM boards.**  
> Seller track `docs/ec-s-roadmap.md` (T01–T33) + polish/PK is **closed**. Buyer promises exist only as **marketing chips** on `/for-buyers` (`forBuyers.pillars[].tag` = `live` | `soon`) plus six trust sentences. There is **no** buyer `promises.json`, no `docs/ec-b-roadmap.md`, no `K EC` / `S EC` buyer-roadmap card.

This report is the completion audit Claude asked Cursor to produce: what the page promises, what the code actually does, and what the **next briefs must account for**.

---

## Operator summary (forwardable)

| Piece | Status | Notes |
| --- | --- | --- |
| Formal “Buyer Promise Roadmap” doc / ledger / board card | **DOES NOT EXIST** | Do not treat EC-S as the buyer track. Write `docs/ec-b-roadmap.md` + ledger if product wants parity. |
| Pillar 01 SAVE — €0 buyer commission | **LIVE and true** | Policy. No buyer-side sale fee. Flat catalogue only (T04 row 8). |
| Pillar 02 KNOW — OMI on every listing before enquire | **CHIP LIVE / PRODUCT OVERSTATED** | Band is sign-in gated + `NEXT_PUBLIC_VALUATION_BAND_ENABLED`. `OmiPricePanel` is **unmounted**. |
| Pillar 03 MOVE — enquire + structured viewings | **CORE LIVE / TAIL MISSING** | Book/confirm/ICS live. **05e outcome capture never built** (EC-4 out of scope). |
| Pillar 04 WIN — Verified Buyer Badge | **CHIP = COMING SOON** | EC-1 code exists; needs B4A-1 URL + partner token. Seller ledger **P4 is already `live`** — honesty split. |
| “Verified buyers get answered first” | **NOT BUILT** | Inbox **displays** badge only. No priority sort. |
| Trust: identity-verified sellers | **MOSTLY LIVE** | VO live; badge on `ListingCard` when `trust.verifiedOwner`. |
| Trust: ownership checks on the listing | **SELLER-SIDE ONLY** | VO + checklist exist; buyer listing page does not surface them. |
| Trust: price-anomaly screening | **NOT BUILT** | No bait-price queue. OMI used in seller analytics/nudges only. |
| Trust: agencies-as-privates enforced | **OVERSTATED** | T19.2 image-dup / suspend ≠ agency-posing detector. |
| Trust: post-viewing accountability | **NOT BUILT** | Same as 05e. No badge-strip path. |
| Trust: one-tap buyer report | **ADMIN ONLY** | `admin/listing-reports` + DSA queue. No listing-page report CTA. |
| Acquisto Assistito | **MAILTO ONLY** | Tiers €290 / €1.490 / €2.900; `mailto:acquisti@easycasaita.com`. |
| Analisi Aste | **BUILT, FLAG-GATED** | Do not flip `ASTE_ANALYSIS_ENABLED` without G2 / counsel. |
| Consult / “Buying a property” KB | **ABSENT** | Zero repo matches. |
| Kaizen / Startup buyer-roadmap card | **ABSENT** | Startup EasyCasa board has only `S EC 1.56` (seller close-out, 100%). |

**Call for R&D:** do **not** dispatch “complete the buyer roadmap” as one agent. There is no roadmap to close. Split: (A) honesty pass on `/for-buyers` copy vs code, (B) B4A-1 ops + optional P04 chip flip, (C) optional new features (05e, public report, public OMI) each as its own Kaizen code with a T04 row.

---

## 1. What Claude cannot see (repo reality)

### 1.1 Stack (unchanged)

- Monorepo: **pnpm** · `apps/web` Next.js App Router · `apps/api` NestJS · `packages/shared` · Docker Compose + Caddy/Traefik on one VPS.
- i18n: IT / EN / ES in `apps/web/messages/*.json`. Buyer landing keys: `forBuyers.*`.
- Promise-ledger machinery is **seller-only**: `apps/web/src/config/sell-privately/promises.json` + `apps/web/src/lib/promiseLedger/` + build validator `apps/web/scripts/validate-promise-ledger.mjs`.
- Buyer chips are **hardcoded** in i18n (`pillars[].tag`: `"live"` | `"soon"`), rendered by `ForBuyersPage`. No schema, no flip protocol, no CI honesty gate.

### 1.2 Canonical buyer surfaces

| Surface | Path |
| --- | --- |
| Live landing | `/{locale}/for-buyers` → `ForBuyersPage` + `for-buyers.css` |
| Design HTML | `docs/design/easycasa-for-buyers.html` |
| Enquiry + B4A field | `ContactEnquiryForm` (`b4a_affordability_share` + tracking URL) |
| Listing OMI/AVM | `ListingValuationGate` (auth) → `ListingValuationBandSection` |
| Viewings | `/{locale}/listings/[slug]/book` · EC-3–7 · `docs/ec-4-viewing-process.md` |
| VO badge on cards | `ListingCard` when `l.trust?.verifiedOwner` |
| B4A spec | `docs/banks4all-integration.md` Phase B — “needs B4A-1 staging + partner token” |
| Env | `BANKS4ALL_ATTESTATION_BASE_URL`, `BANKS4ALL_PARTNER_TOKEN` (`docs/env.md`) — empty → fail-soft |
| Acquisto Assistito | `docs/acquisto-assistito.md` — mailto, not checkout |

### 1.3 Seller ledger vs buyer page (the split that will burn the next brief)

Seller `promises.json` (updated 2026-08-15):

| Promise | State | Meaning |
| --- | --- | --- |
| P1 Zero commission | `live` | Seller-side €0; buyer page repeats this as pillar 01 |
| P2 OMI guidance | `live` | Seller wizard / analytics — **not** the same as public listing OMI |
| P3 Verified Owner | `live` | PK-1 |
| **P4 Verified buyers** | **`live`** | Note: “buyer-side live; seller inbox after T20” |
| P5 Viewing scheduler | `live` | EC-3–7 |
| P6–P8 | `live` | Seller checklist / analytics / consent |

Buyer page pillar 04 is still **`soon`** / “Verified Buyer Badge (coming soon)” in the compare table. **P4 live ≠ badge production-ready.** EC-1 is implemented against an empty partner token.

---

## 2. Pillar-by-pillar (page copy vs code)

### 01 / SAVE — Zero buyer commission — **keep live**

True as policy. Catalogue and Stripe rails are flat / success-independent (T04 row 8). Do not invent a buyer % fee. Hero “≈ €9.150 avoided on €250.000” is the same Claim-1 style estimate already live on sell-privately (footnote on the page). No eng work unless copy/legal revisit.

### 02 / KNOW — Fair-price check on every listing — **honesty gap**

Page says the buyer sees whether asking is inside / above / below the OMI zone **before they enquire**.

What actually happens:

1. Listing page mounts `ListingValuationGate` → `RegisteredOnly`. Signed-out users get a sign-in prompt, not a band.
2. Band fetch is further gated by `NEXT_PUBLIC_VALUATION_BAND_ENABLED === 'true'` (`valuation-band.ts`). Flag off → section returns `null`.
3. `OmiPricePanel` (`apps/web/src/components/listings/OmiPricePanel.tsx`) has **no production importer**. Tests only. Seller wizard does **not** mount it either (grep 2026-09-07).
4. OMI **does** appear in seller analytics (`priceVsOmiBandPct`) and Aste reports — wrong surfaces for this promise.

**T04 row 2** still applies: OMI is official statistical data, never “we suggest you pay X”. AVM must not present as an official valuation (`CLAUDE.md` §5).

**Next brief must pick one:** (i) show zone band to signed-out buyers (T04-safe copy), or (ii) change pillar 02 / how-it-works step 2 to “sign in to see the band”, or (iii) leave chip `soon` until (i).

### 03 / MOVE — Direct contact, structured viewings — **core live, promised tail missing**

Live: enquiry → owner inbox; public slots → book → seller confirm/cancel/no-show; ICS + reminders (`docs/ec-4-viewing-process.md`).

**Explicitly out of scope in EC-4:** “05e outcome capture”. The page still says *“afterwards, both sides report how it went”* and trust item *“buyers confirm the home matched the listing; sellers who mislead lose their badge.”*

No `viewing_outcome` / match-feedback table. `POST viewings/:id/no-show` is conductor no-show, not listing-accuracy feedback. No path from a buyer “did not match” report to VO badge revocation.

**T04 row 4** (scheduler allowed) + **row 12** (no negotiation advice). A 05e brief must stay “did the listing match the visit”, not deal advice.

### 04 / WIN — Verified Buyer Badge — **the only chip still `soon`**

**Built (EC-1 / T04 row 6):**

- Enquiry optional Banks4All tracking URL + `b4a_affordability_share` consent (`ContactEnquiryForm`).
- API `Banks4AllPort` / `HttpBanks4AllAdapter`; fail-soft if env empty.
- Cached band / expiry / initials on the enquiry; nightly sweep clears on 404/401.
- Owner email + seller inbox / conducting list **display** the badge.
- Tracking URLs are **not** forwarded to owners (correct). EasyCasa must make **no solvency representation of its own** (`CLAUDE.md` §5).

**Not built / not ops-ready:**

| Gap | Detail |
| --- | --- |
| B4A-1 partner token | `BANKS4ALL_PARTNER_TOKEN` + attestation base URL. Spec still says Phase B “needs B4A-1 staging + partner token”. |
| Chip flip | `forBuyers.pillars[3].tag` is `"soon"` in EN/IT/ES. Compare row still “coming soon”. |
| “Answered first” | **False today.** Inbox lists enquiries; badge is decoration. Priority sort would be new eng (and a T04 row 6 recharacterisation risk — “presentation of a ready buyer”). |
| Seller P4 vs buyer chip | Ledger already `live`. Flipping the buyer chip without a working token recreates the Claim 1–2 class of honesty bug in reverse. |

**Do not brief “priority answer” and “badge display” as one task.** Badge display is EC-1. Priority is a new product decision with a sharper mediazione profile (`CLAUDE.md` §1 composite reading: badge + matching).

---

## 3. Trust band — six sentences vs six implementations

| Trust sentence on `/for-buyers` | Reality 2026-09-07 |
| --- | --- |
| Identity-verified sellers; marked on every listing | **Partial.** VO live + staffed (Ibrahim / Silvana). Badge only when `voState` is active. Listings without a verified case show **no** mark. Copy says “before they can publish” — publish is not hard-gated on VO. |
| Ownership / cadastral checked against identity | **Seller tools only.** Checklist + VO docs. Buyer listing page does not show cadastral / ownership-check state. |
| Price-anomaly screening; bait pricing reviewed | **Not built.** No admin anomaly queue, no auto-flag on publish. |
| Privates only, enforced; agencies posing as privates removed | **Overstated.** T19.2 = duplicate-image enforce + admin suspend. No agency-posing classifier. |
| Accountability after every viewing | **Not built.** EC-4 05e still out of scope. |
| One-tap report; every report reviewed by a person | **Admin-only.** `AdminListingReportsController` + admin Takedown page. **No** public `POST` from the listing page, no one-tap CTA in `ListingLandingShell` / `ListingSummaryCard`. |

If the next brief is “make the page honest”, the cheapest close is **copy** (drop or `soon`-chip the four unbuilt trust lines). If the brief is “make the page true”, that is **four new features**, not a polish ticket.

---

## 4. Adjacent buyer products (not pillars, still unfinished)

| Product | Status | Gate |
| --- | --- | --- |
| Acquisto Assistito (`/acquisto-assistito`) | Marketing + mailto. Fees €290 / €1.490 / €2.900 + IVA. | T04 row 8 if checkout is ever added — **flat only**. No % of purchase. |
| Analisi Aste | Code + credits exist; `ASTE_ANALYSIS_ENABLED` off. | Counsel / G2. `sanabilità` banned. Extract-and-cite, not generated legal risk (`CLAUDE.md` §3). |
| Banks4All hub (`/banks4all`) | Phase A referral **live** (no PII, no query params). | Must not become credit-need intake (OAM). |
| Consult / Buying KB | **Not in repo.** | New product. Cite T04 rows per article. Portal copy vs “agenzia regolare” tagline is still unresolved (`CLAUDE.md` §1.2). |

---

## 5. Boards

Queried 2026-09-07:

- Startup `https://www.azizmubasher.net/startup/api/boards/easycasa` — **one** task: `S EC 1.56` EC-S close-out, 100%, done.
- Kaizen EasyCasa named customs are seller PP/PK (`K EC 1.50`–`1.56`, `7.4`) — all **done**.
- No card named Buyer Promise / EC-B / for-buyers.

**Do not invent a Kaizen code in the next brief.** Assign `K EC x.y` (category: Sales or Operations) and optionally `S EC` Phase 3–4 **before** dispatch. One agent per code.

---

## 6. Recommended next briefs (split; do not batch)

| Order | Brief | Type | T04 | Acceptance (minimum) |
| --- | --- | --- | --- | --- |
| **0** | Write `docs/ec-b-roadmap.md` + buyer `promises.json` (optional but recommended) | Spec | — | Same flip protocol as seller (`live` / `coming` / `fallback`). Chips read the ledger. Claude owns this spec; Cursor implements only after the spec exists. |
| **1** | `/for-buyers` honesty pass | Copy + i18n | 2, 4, 6, 7 | Every `live` chip is true for a signed-out buyer **or** moved to `soon`. No “answered first” until priority exists. Dual validators if a ledger is added. |
| **2** | B4A-1 ops + P04 flip | Ops then tiny copy PR | **6** | Staging URL + partner token; one real enquiry shows band to seller; **then** flip pillar 04. Fail-soft stays. No solvency sentence from EasyCasa. |
| **3** | Public OMI band (only if product keeps pillar 02 live) | Eng | **2** | Signed-out listing shows zone range + attribution; never a price recommendation; AVM not “official valuation”. |
| **4** | Viewing 05e outcome | Eng | 4, 7, **not 12** | Both sides can mark “matched / not matched”. Define (separately) whether that can revoke VO. |
| **5** | Public one-tap listing report | Eng | 7 | Buyer CTA → `listing_reports` → existing admin queue. Human review already exists. |
| **6** | Acquisto Assistito checkout / Aste ungate / Consult KB | Separate products | 8 / §3 / new | Own briefs. Not “buyer roadmap leftover”. |

**Refuse in any brief:** offer collection, *proposta*, *caparra*, negotiation advice (rows 10–12); % or contingent buyer fees; `sanabilità` / generated legal-risk conclusions; unredacted auction debtor PII.

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE

- Task received: *check remaining work to complete EasyCasa — Buyer Promise Roadmap*, then *create an R&D report for Claude*.
- Delivered: this audit only. **No product code, no chip flips, no flag changes, no invented Kaizen code, no board card.**
- Did **not** invent `docs/ec-b-roadmap.md` — that would be Claude’s spec, not Cursor guessing a 33-task clone of EC-S.

### 2. WHERE THE BRIEF FAILED YOU

- **Missing artefact.** “Buyer Promise Roadmap” is not a file, issue, PR, or board card. Closest objects: `/for-buyers` i18n pillars and seller `promises.json` P4/P5.
- **Ambiguous “complete”.** Could mean (a) flip pillar 04, (b) make every live sentence true, or (c) author a new EC-B track. This report assumes Claude needs (b)+(c) inputs, not a silent (a).
- **Over-specified if you treat EC-S as the template.** Seller T01–T33 is the wrong spine. Buyer work is four pillars + six trust claims + two paid add-ons.
- **Wrong if assumed P4 live = badge live.** Seller ledger and buyer marketing disagree.

### 3. REPO REALITY CHECK

- Stack: pnpm monorepo, Next.js `apps/web`, NestJS `apps/api`, shared types, VPS Docker + Traefik pair.
- Seller promise ledger + flip protocol is mature (`promises.json` + dual validators + counsel packets). **Reuse that shape** if you want buyer chips you can trust.
- EC-1, EC-3–7, VO, T19.2, admin DSA reports, Phase A B4A referral **already exist**. The next brief that “builds the buyer badge” or “builds viewings” from scratch will duplicate.
- `OmiPricePanel` is dead code (unmounted). Do not brief “wire the existing panel” without checking the listing page — the live path is `ListingValuationBandSection` behind auth + flag.
- Legal load: `CLAUDE.md` + `T04_mediazione_boundary.md`. Row 6 is ⚠️ conditional. Open question 2 (badge + scheduler as composite *messa in relazione*) is **still unanswered** and is now urgent because the buyer page sells both as live/soon together.
- Boards: EasyCasa Startup/Kaizen have **no** buyer-roadmap task to close.

### 4. EFFORT SIGNAL

- This audit is a **small** docs task.
- “Complete the buyer promise” as **one** implementation brief is **too large** and wrongly scoped. Split as in §6. Honesty pass is the only thing that can close in a single agent without new product decisions.
- B4A-1 is **ops + partner**, not Cursor, until tokens exist.

### 5. BLOCKED / NEEDS A HUMAN

| Who | Decision |
| --- | --- |
| **Aziz / Banks4All** | Provision `BANKS4ALL_ATTESTATION_BASE_URL` + `BANKS4ALL_PARTNER_TOKEN` (B4A-1). Until then pillar 04 stays `soon`. |
| **Aziz / product** | Keep pillar 02 live only if public (signed-out) OMI is in scope; otherwise rewrite. |
| **Aziz / product** | Ship 05e + public report + anomaly/agency claims, **or** delete those sentences. |
| **Aziz / product** | Is “answered first” a real feature? If yes, it is a **new** T04 row 6 brief, not part of the token flip. |
| **Counsel (overdue)** | T04 row 6 + open question 2 (badge × scheduler). `CLAUDE.md` §1: composite reading probably *is* *messa in relazione*. |
| **Claude** | Assign real `K EC` / `S EC` codes **before** dispatch. Category: Sales (badge/OMI/copy) or Operations (report queue). Phase: 3 MVP Build or 4 Private Beta. |

### 6. NEXT TASK SHOULD ACCOUNT FOR

1. Name the artefact. If you want a roadmap, write `docs/ec-b-roadmap.md` with numbered tasks and a buyer ledger **before** sending Cursor “complete it”.
2. Cite **T04 row** on every buyer brief (6 for badge, 2 for OMI, 4 for viewings, 7 for VO/report). ⚠️ rows carry conditions as acceptance criteria.
3. **One Kaizen code, one agent.** Do not bundle honesty copy + B4A ops + 05e + public report.
4. Flip protocol: if you add a buyer ledger, require JSON + validators + tests in the **same** PR. Do not flip `soon` → `live` in a copy PR that also adds features.
5. Web `NEXT_PUBLIC_*` (valuation band, any new buyer flag) needs Dockerfile ARG + compose `web.build.args` in the same PR. Runtime `.env` alone will not light Next.
6. Do not tell Cursor the badge is “not built”. Tell them: **code exists, token missing, chip still soon, P4 already live — reconcile.**
7. Do not tell Cursor to “priority-sort verified buyers” without a counsel/product sentence. That is the matching limb in `CLAUDE.md` §1.
8. Aste / Acquisto Assistito / Consult are **not** leftover buyer-roadmap items. Separate briefs, separate gates.

---

*Engineering constraint report derived from repo + live `/for-buyers` as of 2026-09-07. Not legal advice. T04 counsel verdicts for rows 1–8 and 10–12 remain unchecked (`CLAUDE.md` §4).*
