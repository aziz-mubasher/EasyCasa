# EC-B claims register — `/for-buyers`

**v1 · 2026-09-07.** Seed for **EC-B-21** (`buyer-promises.json` + validator). Human-readable table only — do not treat this file as an enforcement mechanism.

**Page after PR 1:** `/{it,en,es}/for-buyers` at honesty-pass SHA (K EC 1.57 / EC-B-08).  
**Spec:** chat-pasted `docs/ec-b-roadmap.md` v2 §4 (that file is **not on `main`**).  
**T04:** rows 2, 4, 6, 7, 8. Rows 10–12 remain refused.

States: `live` (renders, proven) · `coming` (renders with soon tag + roadmap task) · `blocked` (must not render in `PONTE`) · `retracted` (removed from messages; must not be re-added silently).

Licence column is the set in which the **claim** is lawful to make, not whether the company holds it today. Current operating posture in this repo is still **PONTE** (no `LicenceState` / `LEGAL_ENTITY` objects — `docs/legal/AYNI_STATE_AUDIT.md`).

---

## Corrections to roadmap §4 (do not build on the v2 table as written)

| # | Roadmap v2 said | Repo / this pass |
|---|---|---|
| 3 | Pillar 03 body stays verbatim | Dropped the unbuilt «both sides report» clause. That sentence **is** EC-B-14. Leaving it would fail «every rendered claim is provable, soon, or gone». Title + enquiry/booking stay. |
| 4 | Badge `blocked` | Chip stays **`coming`** on the page (brief: do not flip; do not remove the soon tag). Register records **`coming` + blocked-by B4A-1 token**, and that seller `promises.json` **P4 is already `live`**. Reconcile in EC-B-17. |
| 8 | Price-anomaly `blocked` (soon only if licence allows) | **Removed**, not `soon`. A soon tag in `PONTE` would be a promise. |
| 12 | Retract privacy box; `LEGAL_ENTITY.status = PRE_INCORPORATION` | Privacy box + compare lead-resale row removed. **`LEGAL_ENTITY` does not exist** in this repo. Blocker is draft informativa + no controller object. |
| 2 | Rewrite pillar 02 + how step 2 | Also rewrote **compare OMI cell** to «after you sign in» so the table does not keep the old claim. |
| — | Twelve numbered claims | Also retracted the **hero savings figure**, **services «never a commission»**, **compare footnote 3%+IVA**, and **«gratis / free for buyers»** lines (fee / derived saving). |

---

## A. Surviving `forBuyers.*` keys (every leaf after PR 1)

Same keys in `it.json` / `en.json` / `es.json`. Proven by `apps/web/src/lib/for-buyers-honesty.spec.ts` («keeps the same leaf keys»).

| i18n key | State | Licence | Backing | Evidence if `live` |
|---|---|---|---|---|
| `forBuyers.meta.title` | `live` | all | EC-B-08 | Route `generateMetadata` in `apps/web/app/[locale]/for-buyers/page.tsx`. No fee / % / commission token — honesty spec banned-regex. |
| `forBuyers.meta.description` | `live` | all | EC-B-08 | Same. Describes sign-in OMI + enquiry + slots. |
| `forBuyers.hero.kicker` | `live` | all | — | Chrome. No claim. |
| `forBuyers.hero.title` | `live` | all | — | «Buy the same house.» No fee claim. |
| `forBuyers.hero.titleEm` | `live` | all | EC-B-08 | «From the owner.» Replaces «Keep the commission.» |
| `forBuyers.hero.lead` | `live` | all | EC-B-08 + EC-3–7 | Direct contact + viewings. Fee sentence removed. |
| `forBuyers.hero.ctaPrimary` | `live` | all | — | Links `/search`. «it's free» removed. |
| `forBuyers.hero.ctaSecondary` | `live` | all | — | Opens the intro film. |
| `forBuyers.hero.ctaPricing` | `live` | all | EC-PRICING-FINAL PR A | Links `/pricing`. |
| `forBuyers.tags.live` | `live` | all | — | Chip label. CSS `text-transform: uppercase` — tests scan keys, not DOM. |
| `forBuyers.tags.soon` | `live` | all | — | Chip label. |
| `forBuyers.services.kicker` | `live` | all | — | Chrome. |
| `forBuyers.services.title` | `live` | all | EC-B-08 | Count «Four» removed after pillar 01 retraction. |
| `forBuyers.services.sub` | `live` | all | EC-B-08 | Sign-in OMI + enquire + book. Commission sentence removed. |
| `forBuyers.pillars[0].*` (idx `02 / KNOW`) | `live` | all | EC-B-08 copy · 15 Sep label | Title is factual («Official OMI range»), not *fair*. Body still sign-in scoped. **`OmiPricePanel` unmounted — do not cite it.** |
| `forBuyers.pillars[1].*` (idx `03 / MOVE`) | `live` | all | EC-3–7 | `POST /viewings`, `/{locale}/listings/[slug]/book`, confirm / cancel / no-show / ICS — `docs/ec-4-viewing-process.md`. 05e outcome **not** claimed here. |
| `forBuyers.pillars[2].*` (idx `04 / WIN`) | **`retracted`** | — | 15 Sep brief | Entire Verified Buyer Badge / Banks4All sister-company row removed from messages. Do not re-add. Delibera block waits on Credit Prime + DPIA. |
| `forBuyers.model.*` | `live` | all | EC-PRICING-FINAL PR A | «No commission. You pay for documents» + one-side rule + CTA `/pricing`. Lawful only while buyer-side `provvigione` SKUs stay inactive. |
| `forBuyers.trust.kicker` | `live` | all | — | Chrome. |
| `forBuyers.trust.title` | `live` | all | — | Chrome. |
| `forBuyers.trust.sub` | `live` | all | EC-B-08 | States VO is a badge, not a publish gate. |
| `forBuyers.trust.items[0].*` | `live` | all | T14–T17 / PK-1 | `listing-trust.ts` `verifiedOwner`; `ListingCard` badge when `l.trust?.verifiedOwner`. Publish is **not** hard-gated. |
| `forBuyers.trust.items[1].*` | `coming` | all | EC-B-14 | Tag **`soon`**. 05e was out of scope in EC-4. |
| `forBuyers.trust.items[2].*` | `coming` | all | EC-B-15 | Tag **`soon`**. Admin `listing_reports` exists; no public CTA. |
| `forBuyers.how.kicker` | `live` | all | — | Chrome. |
| `forBuyers.how.title` | `live` | all | — | Four steps remain. |
| `forBuyers.how.steps[0].*` | `live` | all | search | `/{locale}/search`. Dropped «no duplicates / no ghost listings» (unproven). |
| `forBuyers.how.steps[1].*` | `live` | all | EC-B-08 | Sign-in to see OMI band. |
| `forBuyers.how.steps[2].*` | `live` | all | enquiry | Contact form. Badge attach sentence **retracted** 15 Sep. |
| `forBuyers.how.steps[3].*` | `live` | all | EC-3–7 | Book + confirmation. «Tell us how it went» removed (EC-B-14). |
| `forBuyers.compare.kicker` | `live` | all | — | Chrome. |
| `forBuyers.compare.title` | `live` | all | — | Chrome. |
| `forBuyers.compare.agency` | `live` | all | — | Column header. |
| `forBuyers.compare.easycasa` | `live` | all | — | Column header. |
| `forBuyers.compare.rows[0].*` | `live` | all | enquiry | Owner inbox / enquiry, not an agent desk. |
| `forBuyers.compare.rows[1].*` | `live` | all | EC-B-08 | «After you sign in» — matches pillar 02. |
| `forBuyers.compare.rows[2].*` | `live` | all | EC-3–7 | Slot picker. |
| `forBuyers.compare.rows[3].*` | `live` | all | search `sellerType` | Search filter Private / Agency. Badge compare row **retracted** 15 Sep. |
| `forBuyers.final.title` | `live` | all | — | Chrome. |
| `forBuyers.final.titleLine2` | `live` | all | — | Chrome. |
| `forBuyers.final.body` | `live` | all | search | Fee / «always free» removed. |
| `forBuyers.final.cta` | `live` | all | — | Links `/search`. |
| `forBuyers.foot.mundida` | `live` | counsel-open | PRE_INCORPORATION | 15 Sep About pass: Mundida P.IVA no longer presented as EasyCasa’s. Same `/pricing` named hole + non-enrolment sentence. “Directly” removed (G4 / `routeLead`). |
| `forBuyers.foot.omi` | `live` | all | T04 row 2 | Attribution; «not valuations». |
| `forBuyers.foot.privacy` | `live` | all | — | Nav label only. Not a processing claim. |
| `forBuyers.foot.terms` | `live` | all | — | Nav label only. |

---

## B. Retracted keys (removed from all three locales)

These strings must not reappear on `/for-buyers` without a flip PR that cites evidence.

| Former key / claim | Why | Blocked by | Next task |
|---|---|---|---|
| `hero.figure` `≈ €9.150` | Derived saving; catalogue sells `BUYER_MEDIATION` 2,49 % | **G1** | EC-B-22 / AYNI PR 3 |
| `hero.figureLabel` | Same | **G1** | EC-B-22 |
| `hero` «No buyer-side fee. Ever.» / «Niente provvigione» | Fee claim | **G1** / T04 row 8 | EC-B-22 |
| `services.sub` «never charges you a commission» | Fee claim | **G1** | EC-B-22 |
| Pillar `01 / SAVE` entire object | Zero buyer commission | **G1** | EC-B-22 |
| Compare row buyer-side fee / €0 | Same | **G1** | EC-B-22 |
| `compare.footnote` 3% + IVA | % of purchase | T04 row 8 | — |
| `final.body` / CTAs «free for buyers» / «è gratis» | Fee claim | **G1** | — |
| «Verified buyers get answered first» (pillar 04 body + compare implication) | Not built; matching limb | Counsel T04 row 6 + OQ2 | **EC-B-23 — do not build** |
| «negotiate stronger» / «negozia meglio» | T04 row 12 | — | — |
| Trust «Ownership checks» | Seller checklist / visura only; buyer sees nothing | GDPR-2 + licence | EC-B-11 |
| Trust «Price-anomaly screening» | Not built; lot-merit *stima* | `PONTE` | EC-B-12 (file checks ≠ this claim) |
| Trust «Privates only, enforced» | T19.2 is image-dup + suspend | Homepage still «agenzia regolare» | EC-B-13 |
| `how.privacyStrong` / `privacyBody` / `privacyLink` | Data-handling claim; informativa draft; no `LEGAL_ENTITY` | Gate 0 / GDPR-1 | AYNI PR 5 then informativa v1.0 |
| Compare «contact data resold as leads / Never» | Same GDPR surface | Gate 0 | GDPR-1 |
| «before they can publish» | Publish not VO-gated | — | EC-B-10 (blocked in `PONTE`) |
| Pillar 03 «afterwards both sides report» | 05e out of scope | — | EC-B-14 (`coming` on trust item) |
| How step 4 «tell us how it went» | Same | — | EC-B-14 |
| Pillar `04 / WIN` Verified Buyer Badge + Banks4All sister-company body | Reserved-act attribution + group routing + person-badge; *coming soon* made it worse | OAM / art. 22 GDPR / T04 row 6 | Credit Prime delibera (not a badge) after DPIA |
| «Fair-price check» / «Controllo prezzo equo» / «precio justo» | Verdict next to a price (T04 row 2; same rule as Legenda semaforo) | — | Keep factual OMI title |
| How step «Attach a Verified Buyer Badge if you have one» | Same badge | — | — |
| `foot.mundida` «financing services … sister company» | Reserved act + declared group link | OAM | Retracted 15 Sep. Identity now the `/pricing` hole, not Mundida’s P.IVA. |

---

## C. Roadmap twelve-claim map (post PR 1)

| # | Claim | State on page | Licence | Task |
|---|---|---|---|---|
| 1 | Zero buyer commission + ≈€9.150 | **`retracted`** (false chip). Honest «no commission / documents not the deal» is **`live`** on `model.*` after PR A | all | EC-B-08 · EC-PRICING-FINAL |
| 2 | OMI range (was «fair-price check») | **`live`**, factual label, sign-in scoped | all | EC-B-08 · 15 Sep |
| 3 | Direct contact, structured viewings | **`live`** | all | EC-3–7 |
| 4 | Verified Buyer Badge | **`retracted`** | — | 15 Sep · do not rebuild as a person-badge |
| 5 | Answered first | **`retracted`** | counsel only | EC-B-23 |
| 6 | Identity-verified sellers | **`live`**, badge-scoped | all | T14–T17 |
| 7 | Ownership / cadastral vs identity | **`retracted`** | `AGENTE_IMMOBILIARE`, `OAM` | EC-B-11 |
| 8 | Price-anomaly screening | **`blocked`** (not rendered) | `AGENTE_IMMOBILIARE`, `OAM` | EC-B-12 |
| 9 | Privates only, enforced | **`retracted`** | all | EC-B-13 |
| 10 | Post-viewing accountability | **`coming`** | all | EC-B-14 |
| 11 | One-tap report | **`coming`** | all | EC-B-15 |
| 12 | «Your data books your viewing» | **`retracted`** | all | Gate 0 |

---

## D. What this register is not

- Not `buyer-promises.json`. EC-B-21 owns the machine form and depends on `EC-AYNI-1` PR 2 (`PERIMETER`).
- Not a flip protocol. A later PR that puts a retracted string back without evidence is the defect this table exists to catch.
- Not counsel sign-off. `counsel_status` stays not-reviewed. `signed_by` capacity is not recorded here.

*Written against `forBuyers` in `apps/web/messages/{it,en,es}.json` after EC-B-08 PR 1. Test: `apps/web/src/lib/for-buyers-honesty.spec.ts`.*

---

## E. Dual-channel intro (2026-09-08)

Product feedback: buyers may purchase from a **private seller** or through a **real-estate agency**. The live `/for-buyers` story and the intro film (`forBuyers.film` + `BuyerIntroFilm` + `public/for-buyers/film/`) follow that. Spec: `docs/design/buyer-intro-video.md`.

| Change | Why |
|---|---|
| Hero / how / services / final no longer «privates only» | Search `sellerType` is `private \| agency`; listing contact is «publisher» |
| Compare columns are **Private seller** vs **Agency** (both on EasyCasa) | Replaces «traditional agency vs EasyCasa» |
| Intro film 8 scenes | Same tools; labelled counterparty; OMI after sign-in; transport-only enquiry; slot booking |
| Still retracted | Fee / €9.150 / «answered first» / rows 10–12 |

T04: rows **2, 4, 5**. Film line «EasyCasa carries the message. It does not negotiate.» is row 5 + row 12 refusal, not a matching claim.

---

## F. 15 September 2026 — badge retract + commercial silence

Shipped on `/for-buyers` after EC-PRICING-FINAL PR A landed (`BUYER_MEDIATION` / `OFFER_DRAFTING` / `VIEWING_ACCOMPANIMENT` inactive; no `provvigione` on `GET /service-catalog`).

| # | Change | State |
|---|---|---|
| 1 | Entire Verified Buyer Badge pillar (Banks4All / sister company / Mundida group / *coming soon*) | **`retracted`** |
| 2 | «Fair-price check» / «prezzo equo» / «precio justo» | **`retracted`**; replaced by factual OMI title |
| 3 | Price-list CTA + one-side sentence | **`live`** (`hero.ctaPricing`, `model.*`) |
| 4 | Page-footer P.IVA / entity line | **untouched** — visura still open |
| 5 | Agency-pays / REA block | **not this PR** — waits EC-PRICING-1 PR C |
| 6 | «No commission. You pay for documents» | **`live`** — PR A united |
| 7 | Buyer delibera / Credit Prime block | **not this PR** — waits issuer confirmation + DPIA |
| 8 | Energy class / kWh row | **not this PR** — R4 does not yet gate every published listing |

Honesty spec: `apps/web/src/lib/for-buyers-honesty.spec.ts`. A later PR that restores the badge strings or a *fair* verdict next to price, without evidence, is the defect.
