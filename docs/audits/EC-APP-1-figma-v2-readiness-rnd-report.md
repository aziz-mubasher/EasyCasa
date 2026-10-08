# EC-APP-1 — Figma App v2 readiness — R&D report (for Claude)

**Audience:** Claude (R&D / next-brief author) + Aziz
**Date:** 2026-10-07
**Operator:** Cursor cloud agent
**Request:** Aziz asked whether the App v2 Figma is complete enough to start mobile development, checked against https://easycasaita.com/it, then asked for this report.
**Figma:** [Easy Casa Italia — App v2 (EC-APP-1)](https://www.figma.com/design/lVw7TvOd7c9EbfQpcs0COt/Easy-Casa-Italia-%E2%80%94-App-v2--EC-APP-1-?node-id=0-1) · file key `lVw7TvOd7c9EbfQpcs0COt` · one page `0:1` **App v2 — schermate**
**Repo tip audited:** `origin/main` @ **`180c1b5`** (`fix: land easycasaita.com on Italian instead of browser language`)
**Live site:** https://easycasaita.com/it
**Bridge:** no `task_<hex>` was attached. Ledger was not updated. Do not poll this as a running bridge task.
**T04 rows this surface touches:** **1** (host listings), **2** (OMI as data), **4** (viewings), **5** (messaging transport), **6** (buyer badge), **7** (verified owner), **8** (flat fees only). Rows **10–12** stay prohibited. Do not brief them into the app.

> **Do not brief “build the EasyCasa mobile app from this Figma.”**
> The file is a brand storyboard of 18 static phone frames. It is the right legal posture. It is not a build spec.
> The app already exists: `apps/mobile` (Expo SDK 51, Phase 7 and later). A brief that treats App v2 as a greenfield will duplicate routes and will re-open the % commission checkout that the current product forbids.

---

## Operator summary (forwardable)

| Question | Answer |
| --- | --- |
| Is App v2 complete enough to start development? | **No.** Start only after a scope brief maps each Figma frame onto an existing `apps/mobile` route, names what is retired, and adds the missing frames listed below. |
| What the Figma is | 18 frames, 390×844, one page, four sections. Italian on every functional screen. EN and ES exist only on the welcome screen. No component page, no flow annotations, no empty/error/loading states. |
| What already exists in code | Expo Router app: seeker search/map/favorites/profile, listing, booking, enquiry, saved search, OIDC sign-in, owner home / fascicolo / services / checkout / lease / valuation / enquiry inbox, professional assignment inbox. i18n IT/EN/ES. Push token registration. Deep links planned in `docs/phase-7.md`. |
| Legal alignment of the Figma | **Good.** OMI as official data, verified owner, seller-controlled visits, energy class as a listing duty, document checklist, and an explicit “Cosa non facciamo” screen (no negotiation, no offers, no deposit, no success fee). |
| Legal defect already in the Expo app | **`apps/mobile` still prices `provvigione` as a % of the sale** (`owner.*.json` + `ServiceItemRow` + `QuoteSummary`). T04 row 8 and `CLAUDE.md` §2 forbid this. Do not reskin that checkout. Remove it. |
| Stale spec Claude must not reuse | `docs/system-design.md` still describes a licensed agency, % provvigione, proposta d’acquisto, and a professional mediatore portal. The live footer says EasyCasa is **not** enrolled as a mediatore and does not perform mediazione. Source order: `CLAUDE.md` → `docs/legal/*` → code → this report. |

**Call for R&D:** one brief, not a build. Title it as a **reskin and scope cut of `apps/mobile`**, not a new app. Kaizen placement if a card is created: **Operations · Define**. Do not put it in Sales. Do not create a second mobile codebase.

---

## 1. What is in the Figma (all of it)

Page `App v2 — schermate`. Four sections. Frame names are the source of truth.

### Avvio dell'app

| Frame | What it shows |
| --- | --- |
| `00a Launch screen` | Wordmark, two paths: cerca casa / vendi da privato |
| `00b Splash` | Brand splash |
| `01 Benvenuto (IT)` | Welcome, the two paths |
| `15 Welcome (EN)` | Same welcome in English |
| `16 Bienvenida (ES)` | Same welcome in Spanish |

### Chi cerca casa

| Frame | What it shows |
| --- | --- |
| `02 Cerca` | City, sale/rent, one price chip, one featured card. Tab bar: Cerca, Mappa, Salvati, Profilo |
| `03 Mappa` | Map, price pins, a bottom card, same tabs |
| `04 Annuncio` | One listing: price, OMI band, verified-owner badge, three facts |
| `05 Scrivi al proprietario` | A message box to the owner |
| `06 Prenota una visita` | Pick a slot |

### Chi vende da privato

| Frame | What it shows |
| --- | --- |
| `07 Casa mia` | Seller home for one property |
| `08 Messaggi` | Inbox rows. One row is labelled “Marco R.” |
| `09 La tua regola` | Teaching screen: the seller chooses who enters; no commission |
| `10 Visite` | Seller’s visit list |
| `11 Pubblica · dati energetici` | One publish step: energy class, framed as a legal duty (sanction €500–€3.000), explicitly not a valuation |
| `12 Fascicolo` | Document checklist. Copy says the check can be bought. No price. |

### Account e perimetro

| Frame | What it shows |
| --- | --- |
| `13 Profilo` | Profile links, including legal docs. Assumes a signed-in user. |
| `14 Cosa non facciamo` | Perimeter: no negotiation, no transmitting offers, no caparra, no fee tied to a sale |

There is a **Salvati** tab and no Salvati frame. There is no sign-in frame. There is no results list, no photo gallery, no publish wizard beyond energy, no price list, no payment result.

---

## 2. What to keep

These frames match the live site and the legal floor. The next brief should say “preserve this copy intent”:

- Two doors: **Cerco casa** and **Vendo da privato**. The Expo tab labels already use Cerca / Mappa / Salvati / Profilo (`apps/mobile/src/i18n/locales/it.json`).
- Welcome in IT, EN, ES. The product is trilingual. Functional frames are Italian only; strings belong in the existing i18n files, not as 54 duplicated frames.
- OMI band rendered as Agenzia delle Entrate zone data beside the asking price. T04 **row 2**. Never “we suggest you price at X”.
- **Proprietario verificato** as a badge on the listing. T04 **row 7**.
- Visit booking from the seller’s real slots. T04 **row 4**. The seller conducts the visit.
- Energy class as a publication duty, with the sanction range already used on the pricing page. The frame says it is not a valuation. Keep that sentence.
- Fascicolo as a checklist of documents the seller holds. A bought “verifica” is the flat-fee document check (`DOC_CHECKUP`), a written checklist. It must not output `sanabilità` or a generated legal-risk conclusion (`CLAUDE.md` §3.2, §9).
- **Cosa non facciamo.** This screen is the consumer form of T04 rows 10–12 and row 8. The Expo app does not have it. Add it. Do not weaken it.

---

## 3. Blockers — draw or specify these before any UI sprint

Each row is something the Figma omits and the product already has, or something the Figma shows in a way engineering will implement wrong.

| # | Gap | Repo fact the brief must cite | T04 |
| --- | --- | --- | --- |
| 1 | No sign-in, sign-up, signed-out, or session-expired frame. Profile assumes a session. | `apps/mobile/app/(auth)/sign-in.tsx` is a single OIDC button (`expo-auth-session`). Web auth is the same Keycloak PKCE client pattern (`apps/web/src/auth/AuthProvider.tsx`). `docs/phase-7.md` still has an open ops item: public client `easycasa-app`, redirect `easycasa://auth`. Account deletion is required for store release and is not designed. | — |
| 2 | **Salvati** tab, no screen. | `apps/mobile/app/(tabs)/favorites.tsx` and `app/(search)/saved.tsx` already exist. Web route `/{locale}/favorites`. | — |
| 3 | Search is a poster. | Live web filters (`apps/web/messages/it.json` → `search.filters`): sale/rent/auction/bare ownership, type, rooms, baths, m², energy, region/province/comune, private vs agency, sort. Expo `FilterSheet` already has deal type, price, rooms, type, energy. Figma has city + sale/rent + one price chip. Also missing: result count, list, empty state. | 1 |
| 4 | Listing is one card. | Web listing (`apps/web/app/[locale]/listings/[slug]/page.tsx`): gallery, summary, description, map, contact. Energy badge component exists (`EnergyClassBadge`). Share exists (`ListingShareActions`). | 1, 2 |
| 5 | “Scrivi al proprietario” is a bare text box. | `ContactEnquiryForm` requires sign-in, phone, `mediation_disclosure` consent, `privacy_policy` consent, optional `b4a_affordability_share`. Default message is prefilled. Success and error states exist. Expo has `EnquiryModal`. | 5, 6 |
| 6 | Buyer badge and name reveal are unspecified, and the inbox drawing contradicts the homepage. | Homepage (`home` copy): the seller sees a capacity band and an expiry, not the surname and not the phone; contact details move when **both** sides confirm the visit. Figma inbox shows “Marco R.” and a chat, with no badge. Expo already has `Banks4AllAffordabilityBadge` on the owner side. Badge is a third-party attestation. EasyCasa makes no solvency claim. It is not a loan form. | 6 |
| 7 | Publish is one energy step. | Shared wizard `WIZARD_STEPS` in `@easycasa/shared`: `basics → address → details → price → photos → description → review`. Web implements it. The Expo app does not. APE / energy data gates publication. Owner and title verification (the homepage promise) have seller screens on the web (`seller/listings/[id]/verification`) and no Figma frames. | 7 |
| 8 | “Puoi comprare la verifica” has no price, no order, no receipt. | Catalogue is flat-fee and success-independent. Web pricing rows include `LISTING_PUBLICATION`, `VALUATION`, `DOC_CHECKUP`, `CONFORMITY_SURVEY`, `MEDIA_PACK`, `VIRTUAL_TOUR`, `VIEWING_KIT`, `LEASE_DRAFTING`, `RLI_REGISTRATION`. Stripe checkout exists on the web (`/{locale}/pagamento/checkout`). Expo already has `services.tsx`, `checkout.tsx`, `QuoteSummary`. **That checkout still renders % provvigione. Do not design on top of it.** Payment rail (Stripe Payment Sheet vs open the website) is an Aziz decision. | 8 |
| 9 | No loading, empty, error, offline, or permission frames. | Map needs location permission. Publish needs photo permission. Push needs notification permission (`expo-notifications`, `POST /me/devices`). | — |
| 10 | Buyer tabs and seller tabs are different and unconnected. | Expo seeker tabs: Search, Favorites, Profile (Map tab is `href: null` — map is the search screen). Owner is a separate stack `(owner)`, not a tab. Pro is a third stack `(pro)`. The Figma draws a seller tab bar (Casa mia, Messaggi, Visite, Profilo) with no rule for how a person who both searches and sells switches. | — |

---

## 4. Second design pass — live product, not required to open the scope brief

Do not stuff these into the first reskin brief. Name them so they are not forgotten.

- **Valutazione gratuita** — web route `/{locale}/valutazione-gratuita`, no account. Expo has `(owner)/valuation.tsx`, which is the owner tool, not that public page.
- Buyer’s own visit list. Seller availability editor is web `seller/listings/[id]/availability`. Figma shows the seller list and the buyer slot picker only.
- Message thread. Figma and the Expo inbox are lists. T04 row 5: transport only. EasyCasa does not read or coach the negotiation.
- Fixed-price service entry for each catalogue row the v1 app should sell. One priced example in the first brief is enough (document check). The rest can follow.
- Push copy for messages, visit confirm, listing status.
- In-app privacy, terms, mediation disclosure, transparency, and “I miei dati” (`/{locale}/i-miei-dati`, `/{locale}/legal/*`). Profile may link out; say so.
- Rent listing (canone, contract type). Expo already has an owner lease screen (`(owner)/[propertyId]/lease.tsx`). Decide if v1 keeps it.
- Share / universal link. `docs/phase-7.md`: `listing/{slug}` plus AASA / assetlinks. Team ID and Play SHA-256 are still open ops items.

---

## 5. Leave out — do not add these frames

| Item | Why |
| --- | --- |
| Aste analysis | Built on the web, flag-gated. `CLAUDE.md` §3. Do not put it in the consumer app. Do not flip `ASTE_ANALYSIS_ENABLED`. |
| Proposta d’acquisto, caparra, offer collection, negotiation advice | T04 rows **10–12**. The footer “Come funziona una proposta di acquisto” is a general note (`PROPOSAL_NOTE`), not a template. |
| Any % of sale or success fee | T04 row 8. The Expo strings `owner.svc.provvigione` (“{{rate}}% provvigione sulla vendita”) and `owner.quote.provvigioneNote` (“matura solo alla conclusione dell'affare”) are a defect, not a feature to redesign. |
| `sanabilità` or an unsigned legal-risk rating | `CLAUDE.md` §3.2, §9. |
| Admin, Casafari import | Web-only internal tools. |
| Banks4All as an in-app credit application | Badge and outbound referral only. `CLAUDE.md` §5. Nothing sent to EasyCasa may be a credit-need intake. |
| Professional mediatore inbox as “EasyCasa negotiates for you” | `apps/mobile/app/(pro)/` is the Phase 15 assignment inbox (APE, tecnico, photographer, and historically mediatore). A reskin brief must say which assignment types survive. Mediazione assignments do not, while the live posture is “non svolge attività di mediazione”. |

---

## 6. Map the next brief onto files that already exist

Claude cannot see the tree. Use this.

| Concern | Path |
| --- | --- |
| Mobile app | `apps/mobile` — Expo ~51, expo-router ~3.5, React Native 0.74.5, i18next, TanStack Query, `react-native-maps` / maplibre |
| Seeker UI | `apps/mobile/app/(tabs)/*`, `app/(search)/*`, `app/listing/[slug].tsx`, `app/booking/[listingId].tsx` |
| Owner UI | `apps/mobile/app/(owner)/*` — index, enquiries, valuation, fascicolo, services, checkout, lease |
| Pro UI | `apps/mobile/app/(pro)/*` — inbox, assignment, credentials |
| Auth | `apps/mobile/app/(auth)/sign-in.tsx`, `apps/mobile/src/auth/AuthProvider.tsx` |
| % fee defect | `apps/mobile/src/i18n/locales/owner.it.json` (and `.en.json`, `.es.json`), `src/components/owner/ServiceItemRow.tsx`, `QuoteSummary.tsx` |
| Buyer badge UI | `apps/mobile/src/components/owner/Banks4AllAffordabilityBadge.tsx` |
| Design tokens | `packages/design-tokens` — already shared with web |
| API client | `packages/api-client` |
| Web search filters | `apps/web/src/components/search/SearchFilters.tsx` |
| Web listing | `apps/web/app/[locale]/listings/[slug]/page.tsx` |
| Web enquiry | `apps/web/src/components/listings/ContactEnquiryForm.tsx` |
| OMI / AVM band | `ListingValuationGate` wraps `ListingValuationBandSection`. Signed-out users get a sign-in prompt. Band also requires `NEXT_PUBLIC_VALUATION_BAND_ENABLED=true`. `OmiPricePanel` has no production importer. The Figma shows the band on the listing with no sign-in. The brief must choose: public official band (T04 row 2, preferred) or keep the sign-in gate and change the frame. |
| Publish wizard | `@easycasa/shared` `WIZARD_STEPS`. Web only. |
| Phase 7 contract | `docs/phase-7.md` — SEO stays on Next.js; the app is the logged-in shell. Keycloak client, AASA team id, Play fingerprint, EAS builds are still unchecked. |
| Legal matrix | `docs/legal/T04_mediazione_boundary.md`, `CLAUDE.md` §2 and §9 |
| Pricing copy | `apps/web/messages/it.json` → `pricing.rows` |

Stack the next brief should assume: pnpm monorepo, NestJS API, Next.js site for public SEO, Expo app for the logged-in product, Keycloak OIDC, Stripe for flat fees, IT/EN/ES string files. There is no second design system to invent.

---

## 7. Minimum pack that unblocks a sprint

Ask the designer for these frames, mapped to the routes above, before Cursor implements UI:

1. Signed-out and signed-in profile, plus the existing OIDC sign-in (not a new password form).
2. Salvati (favorites and saved searches — both already exist in code).
3. Search filters and a results list, including empty.
4. Listing: gallery, facts, energy, OMI band, share, the two actions (visit / write).
5. Enquiry with the three consents and the optional badge. Success and error.
6. Seller inbox that shows the badge and does not show a surname before the reveal rule.
7. Publish steps that match `WIZARD_STEPS`, with energy as the gate it already is.
8. One service, the document check, with a fixed price before purchase and a receipt. No % line.
9. Empty, error, and the three permission prompts (location, photos, notifications).
10. A one-page navigation note: seeker tabs vs owner stack, and how one account moves between them.

`14 Cosa non facciamo` ships with that pack. It is already drawn.

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE

**What Aziz asked**

- Check the App v2 Figma against what EasyCasa Italia needs, using https://easycasaita.com/it.
- Say what important thing is missing before development starts.
- Then write this report.

**Done**

- Read every frame on page `0:1` (18 frames, four sections).
- Compared them with the live site IA (header, footer, search filters, listing, enquiry, pricing catalogue, seller wizard) and with `apps/mobile`.
- Wrote this ledger. No product code was changed.

**Deviated**

- The first pass treated the Figma as a greenfield storyboard against the website. The repo already contains the Expo app. The report’s conclusion changed because of that. A brief that only says “match easycasaita.com” will miss `apps/mobile` and will miss the % fee still compiled into it.

**Skipped**

- No Figma edits.
- No Kaizen / Startup card. No `task_<hex>` was supplied, so `docs/azm-deliverables/_bridge/status-ledger.json` was not touched.
- Store-listing assets, EAS credentials, and a device run of the Expo app. Not required to answer readiness.

### 2. WHERE THE BRIEF FAILED YOU

| Type | Detail |
| --- | --- |
| Missing | There is no mobile spec. `docs/system-design.md` is the closest document and it is **wrong for the current posture** (licensed agency, % provvigione, proposta, mediatore portal). |
| Missing | No instruction on whether App v2 replaces `apps/mobile` or restyles it. It restyles and cuts. |
| Missing | No T04 row on the Figma file itself. The frames happen to be mostly safe; the existing checkout is not. |
| Ambiguous | “All that’s required” could mean store-ready v1 or a brand prototype. This report treats it as **ready to implement the two journeys the frames already name** (find a home, publish as a private seller). |
| Wrong, if assumed | The homepage sentence (surname and phone hidden until both sides confirm the visit) is stricter than `ContactEnquiryForm`, which collects email and phone at enquiry time. The brief has to pick one rule. Do not leave it to the implementer. |
| Over-specified | Nothing. The Figma under-specifies. |

### 3. REPO REALITY CHECK

- **Monorepo:** pnpm. `apps/web` Next.js (public SEO). `apps/api` NestJS. `apps/mobile` Expo 51 / RN 0.74 / expo-router. `packages/shared`, `packages/api-client`, `packages/design-tokens`. `services/ai` FastAPI. One VPS, Docker Compose.
- **i18n:** web `apps/web/messages/{it,en,es}.json`. Mobile splits strings across `apps/mobile/src/i18n/locales/*.json` (base, owner, pro, payment, discovery, enquiry, valuation, viewings). New copy goes there, IT/EN/ES together.
- **Auth:** Keycloak OIDC PKCE. Mobile sign-in is one button. Phase 7 ops checklist is still open for the `easycasa-app` client, AASA `TEAMID`, Play SHA-256, and EAS builds.
- **Search in the app already:** map-first `(search)/index.tsx`, `FilterSheet`, saved-search modal, favorites tab. Figma re-draws a thinner version.
- **Owner app already:** properties, fascicolo, services, checkout, lease, valuation, enquiry inbox, Banks4All badge component, mandate status card.
- **The checkout is illegal relative to current policy.** `priceModel === 'provvigione'` renders a percentage of the sale. Next brief: delete that price model from the mobile UI. Do not draw a nicer version of it.
- **OMI on the web listing is gated.** `ListingValuationGate` (`RegisteredOnly`) plus `NEXT_PUBLIC_VALUATION_BAND_ENABLED`. The Figma shows the band to everyone. Choose in the brief.
- **Publish wizard** is shared (`WIZARD_STEPS`) and implemented on the web, not in Expo.
- **Tests / lint:** web and api have the main suites. Mobile: `pnpm --filter @easycasa/mobile typecheck|lint|test`. A reskin brief should name that filter, not `pnpm test` at the root only.
- **No mobile doc** under `docs/` except `docs/phase-7.md` (and later phase docs that extend the same app: owner, pro, discovery). Do not invent `docs/ec-app-1.md` as a parallel architecture. If a spec is needed, make it a delta on Phase 7: what v2 keeps, what it cuts, which frames map to which files.

### 4. EFFORT SIGNAL

The Figma review was a read of 18 frames plus the website and the Expo tree. Smaller than a build.

The **next** task is a design-scope brief, still smaller than a build, and it will be under-scoped if it is titled “implement App v2”. Implementing the storyboard naively is a large task: it throws away working routes, misses the wizard and the enquiry consents, and can ship the % fee again.

Split only if product wants it:

1. Scope note + Figma pack in section 7 (design).
2. Strip `provvigione` from `apps/mobile` (small, legal, can land before the reskin).
3. Reskin seeker tabs to the Figma (one build).
4. Reskin owner stack without lease/mandate/pro, unless product explicitly keeps them (one build).

Do not combine 3 and 4 with the pro portal.

### 5. BLOCKED / NEEDS A HUMAN

1. **Aziz — payment rail for in-app fixed fees.** Stripe on a webview/sheet versus “buy on the website”. This decides the checkout frames.
2. **Aziz — contact-reveal rule.** Homepage (hide surname and phone until mutual visit confirm) versus the live enquiry form (collect phone immediately). One sentence in the brief.
3. **Aziz — does v1 keep the owner lease screen and the professional assignment inbox?** They exist. The Figma omits both. Mediazione assignments should stay out.
4. **Aziz — public OMI band vs sign-in gate.** Figma shows it in the clear. Code hides it.
5. **Ops, already open in `docs/phase-7.md`:** Keycloak client `easycasa-app`, Apple Team ID in AASA, Play app-link fingerprint, EAS credentials. Not a design gap. Still blocks a store binary.
6. **Counsel** is not required to reject rows 10–12 or the % fee. Those are already refused. Counsel is still open for the wider T04 packet; do not wait for it to delete the provvigione UI.

### 6. NEXT TASK SHOULD ACCOUNT FOR

- Open with: “Reskin and cut `apps/mobile`. Do not create a new app. Do not follow `docs/system-design.md`.”
- Cite T04 rows **1, 2, 4, 5, 6, 7, 8**. State that rows **10–12** are out of scope on purpose.
- Paste the frame table in section 1 and the file map in section 6 so the implementer does not rediscover them.
- Include an explicit delete: `provvigione` price model and the mandate-as-brokerage checkout copy.
- Specify the enquiry consent fields and the badge as display-only.
- Specify `WIZARD_STEPS` as the publish flow. Energy is one step, not the flow.
- Tell the designer the ten frames in section 7 are the gate. Tell Cursor not to invent them.
- i18n: new strings in the existing locale JSON files, IT/EN/ES in the same change. Do not ask for 54 Figma frames.
- Welcome EN/ES frames are done. Do not redraw them.
- Keep frame `14 Cosa non facciamo` verbatim in intent.
- Board, if Aziz wants a card: Kaizen **Operations**, DMAIC **Define**, progress low until the scope note exists. Startup only if this is declared the Phase 3 app build; it is not that build yet.
- This report’s path: `docs/audits/EC-APP-1-figma-v2-readiness-rnd-report.md`.

---

*Design readiness audit. Not legal advice. Not a build.*
