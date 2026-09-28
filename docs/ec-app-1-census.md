# EC-APP-1 — Census (PR 0)

**Date:** 28 September 2026  
**Brief:** v1.1 (AZM decisions on accounts, domain, payments, and prices)  
**HEAD read:** `e6342bc` (`fix: bump homepage sitemap lastmod after intro-video copy`)  
**Corporate state in code:** `CORPORATE_STATE = 'PONTE'` in `packages/shared/src/corporate-state.ts`.  
**This document is read-only.** It does not change the app, the API, or the catalog.

The four design files named in the brief **are not in the repo**:

- `claude/AZM_EC_Seller_Contact_Shield_Design_v1.md`
- `claude/AZM_EC_Viewing_Organisation_Design_v1.md`
- `claude/AZM_EC_Sell_Privately_Redesign_v1.md`
- `claude/AZM_EC_Pricing_Final_Instructions_v1.md`

The canvas «Easy Casa Italia App» is not in the repo either. This census describes the code. It does not invent copy for the 16 screens.

---

## 0. Immediate flag — payments webhook

The brief says to stop if the production API accepts an unsigned webhook. **The code does not always reject one.**

`POST /payments/webhook` is `@Public()`. In `apps/api/src/payments/payments.controller.ts`:

- when `PAYMENTS_ENABLED` is true, the body goes to `StripePaymentsWebhookHandler`, which rejects a missing or invalid `stripe-signature` header;
- when `PAYMENTS_ENABLED` is false, JSON `{ providerRef, type }` is accepted **with no signature**, and `PaymentsService.handleWebhook` updates the intent.

The boot default is `PAYMENTS_ENABLED: bool(false)` in `apps/api/src/config/load.ts`. `docs/env.md` says the same. An audit dated 2026-09-07 (`docs/legal/AYNI_STATE_AUDIT.md`) says the VPS flag was `true`. **This environment does not read the VPS `.env`**, so the live flag is not re-checked here.

Signature rejection is a property of the flag, not of the binary. With the default, (b) is false.

On the app side, `apps/mobile/src/payments/confirm.ts` **is not stripped from the build**. The `dev_secret_` branch is source that is always compiled. It runs only when the client secret starts with `dev_secret_`. `PspPaymentProvider` emits that prefix when `PSP_API_URL` / `PSP_SECRET_KEY` are missing **and** `ALLOW_PROVIDER_STUBS` is true (default `false`). A Stripe secret does not have that prefix, so the branch does not run against Stripe. It is still in the binary. (a) is false in the sense the brief asked (“does not ship in the production build”).

**API ticket, outside EC-APP-1:** reject `POST /payments/webhook` without a Stripe signature even when `PAYMENTS_ENABLED` is false, or do not mount the unsigned route at all. Do not fix it inside the app PRs.

Brief v1.1 §8 removes `checkout.tsx`, `confirm.ts`, and `billing.tsx` from the v1 bundle. That does not close the hole on the API, which is already public.

---

## 1. Brief §2 facts

| # | What the brief asserted | Result |
|---|---|---|
| 1 | Expo `~51.0.28`, RN `0.74.5`, `react-native-maps` `1.14.0`, `newArchEnabled: false`, bundle `it.easycasa.app` on both platforms | **True.** `apps/mobile/package.json`, `apps/mobile/app.json`. |
| 2 | `@easycasa/design-tokens` still has azure `#1e5ae0`, paper `#f5f4ef`, ink `#16233b`; the web uses ink `#14212e`, paper `#f3ede1`, azure `#2c6e9b`, ochre `#c08a1e` | **True.** The package does not have the names `ink`, `ink-soft`, `paper-deep`, `azure-pale`, `ochre`, `line-strong`. `globals.css` does. `apps/mobile/src/theme/theme.ts` reads `tokens.color.primary` / `paper` / `primaryDark`. The app shows the old colours. |
| 3 | `associatedDomains` and `intentFilters` include `easycasa.it` | **True as a fact about the file.** **AZM decision in v1.1: the only domain is `easycasaita.com`.** Remove `applinks:easycasa.it`, `applinks:www.easycasa.it`, and the `easycasa.it` intent filter in PR 1. Keep `easycasaita.com` and `www.easycasaita.com`. |
| 4 | DEV path posts `POST /payments/webhook` with no signature | **See §0.** The path is in the app source. The API honours it when `PAYMENTS_ENABLED` is false. |

Store name in `app.json` is `"name": "EasyCasa"`. The brief wants «Easy Casa Italia». That is a later PR, not a correction of §2.

`NSLocationWhenInUseUsageDescription` is a single English string. Confirmed.

### `app.easycasaita.com` does not resolve

Checked from this environment on 28 September 2026:

- `easycasaita.com` resolves to `82.25.97.164` and answers HTTPS `307` to `https://easycasaita.com/it`.
- `www.easycasaita.com` resolves to the same address and answers HTTPS `308` to `https://easycasaita.com/`.
- `app.easycasaita.com` has **no DNS record**. `curl` reports `Could not resolve host`.

`app.json` `extra.webAppUrl` is `https://app.easycasaita.com`. `docs/phase-7.md` and `docs/env.md` describe that host as the Expo web shell. `apps/api/src/config/load.ts` lists it in the CORS default. The host is not on the public DNS. PR 1 should point `webAppUrl` at a host that exists (`https://easycasaita.com`) unless AZM publishes `app.easycasaita.com` first. `apps/mobile/src/auth/AuthProvider.tsx` uses `webAppUrl` as a logout redirect. Checkout builds a mandate PDF URL from it; v1.1 removes checkout from the bundle, so that call site goes away with the payment files.

There is still no `apple-app-site-association` or `assetlinks.json` file in the tree. `docs/phase-7.md` checks them off. The files are not here.

---

## 2. v1.1 decisions, recorded so later PRs do not reopen them

Closed by AZM on 28 September 2026:

| Decision | What the code does with it |
|---|---|
| Personal Apple and Google Play accounts (§10-bis) | No code change. PR 6 must reach a Play **closed test** with 12 testers for 14 days. The store seller will be a person. The privacy notice must name the real controller. A later transfer to an organisation account is a runbook item, not a v1 code change. |
| Only domain `easycasaita.com` (§2.3) | Remove `easycasa.it` hosts in PR 1. `app.easycasaita.com` does not resolve today (§1). |
| No payment system in v1 (§8) | Remove `app/(owner)/[propertyId]/checkout.tsx`, `src/payments/confirm.ts`, `src/api/billing.tsx`, and their imports from the v1 bundle. CI scan: zero occurrences of `stripe`, `paymentSheet`, `confirmPayment`, `createIntent` in `apps/mobile`. The app shows a price from the catalog and says payment happens outside the app. No payment link and no checkout WebView. |
| Design example prices: fascicolo **€149**, visit management **€99 / 90 days** | Example figures for the design only. **Do not write them into message files.** The live price comes from the catalog API. The real price list is still open (§13.3) until EC-PRICING-1 sets it. |

Still open, and not answered by the repo:

1. Who the 12 Play closed-test testers are, and who recruits them.
2. The work address (or PO box) and phone to publish as the App Store trader. Email in the brief: `info@easycasaita.com`.
3. The real catalog prices, when EC-PRICING-1 fixes them.

---

## 3. What the routes outside design v1 do today

None of these is in screens 01–14. They remain in the source. v1.1 already decides the fate of checkout and the payment modules: they leave the v1 bundle. The others are described here and are not deleted in this PR.

### `app/(owner)/[propertyId]/checkout.tsx` — out of the v1 bundle

In-app payment and a mandate.

1. Creates an order from the selection passed in the query (`items` / `packageCode`).
2. Invoice preview (`useInvoicePreview`).
3. `createIntent` with `purpose: 'DUE_NOW'` and `confirmPayment` (`src/payments/confirm.ts`).
4. After payment, creates a mandate (exclusivity toggle, default on, duration 6 months) and requests a signing URL. The signer email is hardcoded: `owner@easycasaita.com`.

The client type in `src/api/billing.tsx` also allows `purpose: 'PROVVIGIONE'`. This screen calls only `DUE_NOW`. The API enum `CreateIntentDto` is `DUE_NOW | PROVVIGIONE`.

v1.1 removes this screen, `confirm.ts`, and `billing.tsx` from the bundle.

### `app/(owner)/[propertyId]/lease.tsx`

A lease-contract form, not a listing card.

Types: `LIBERO_4_4`, `CONCORDATO_3_2`, `TRANSITORIO`, `STUDENTI`. Fields: start date, duration, annual rent, cedolare secca, high tension, APE attached. Calls the rentals API for a validation preview, then persists a lease and reads an RLI payload.

Not in design v1. Not removed in this census.

### `app/(owner)/[propertyId]/services.tsx`

Package and catalog picker, quote request, navigation to checkout with the selection serialised. `ServiceItemRow` has a `priceModel === 'provvigione'` branch and its own string `owner.svc.provvigione`. `QuoteSummary` has `owner.quote.provvigioneNote`.

On the server, while `PONTE`, `publicCatalog()` drops `priceModel === 'provvigione'` rows, and `VIEWING_ACCOMPANIMENT` / `FULL_MEDIATION` / `BUYER_MEDIATION` / `OFFER_DRAFTING` are `active: false` in `apps/api/src/service-catalog/domain/catalog.ts`. The UI branch is still compiled. If the corporate flag changes, the percentage row turns itself back on.

### `app/(owner)/valuation.tsx`

An AVM-style estimate. Form: comune, province, type, square metres, rooms, energy class, condition. Coordinates are hardcoded to Milan (`lat: 45.4642`, `lng: 9.19`) with a geocoding TODO. It shows an amount rounded to the nearest thousand and a confidence colour (`high` / `medium` / `low`). It is not an OMI band with zone, semester, and source.

### `app/(pro)/`

Assignment inbox (`useMyAssignments`) and a credentials screen. Assigning a professional to a job is the model of this route. The brief wants it out of the v1 bundle. The code is there and reachable from the router.

### Fascicolo, for contrast

`app/(owner)/[propertyId]/fascicolo.tsx` **is** in the design (screen 12). Today: document checklist, upload, gate banner. It does not state “pay on delivery”. It is not checkout.

---

## 4. §5 rules — does the API already support them?

One row, one ticket. None of these tickets is implemented in the app PRs.

### M1 — the seller’s number never leaves; the message is forwarded whole

**This is not true of every response a buyer can receive.**

| Surface | Seller phone / email |
|---|---|
| `GET /listings/:id` when `:id` is a UUID | `getDetail` → `buildListingDetail`. The agent is `{ id, displayName }`. No phone, no email. This is the shape `EasyCasaListingsApi` expects (`packages/api-client/src/phase21.ts`). |
| `GET /listings/:slug` when `:slug` is **not** a UUID | `ListingsService.getBySlug` spreads the row and adds `agent` from `publicAgentFor`: `{ displayName, phone, slug }`. The `agentId` user’s phone is in the public JSON. The user email is not. The slug is the deep link (`pathPrefix: /listing`). |
| Seeker enquiry (`enquiryForSeekerApi`) | No seller-phone field. `contactPhone` is the writer’s number. |
| Seeker viewing projection (`viewingForSeeker`) | No phone. The exact address is present only when `status === 'CONFIRMED'`. |
| Push `enquiry.new` | Payload: `enquiryId`, `listingId`, `intent`, `message` sliced to 200 characters. The seller’s number is not there. The text is **not** forwarded as written. |
| Thread `GET/POST /enquiries/:id/messages` | The stored body is the text (trim, max 2000). The reply notification carries only `enquiryId` and `messageId`, not a preview. `isLikelySpam` can reject the message: that is not unconditional forwarding. |
| Explicit “I reveal my number” action | No endpoint. |

**Ticket `EC-APP-1-API-M1`.** Remove `phone` from `publicAgentFor` / from the slug branch of `GET /listings/:slug`. Align that branch with the Phase 21 DTO so the slug is not a second contract. The 200-character cut and the spam rejection contradict “forwarded as written” and belong in the same ticket.

### M2 — the declaration travels with the message, verbatim

`CreateEnquiryDto` (`apps/api/src/enquiries/enquiries.controller.ts`) has: `intent` (`info` | `viewing` | `offer`), `message`, `contactEmail`, `contactPhone`, `contactWhatsappAvailable`, `banks4AllTracking`.

Missing: agent yes/no, REA, on whose behalf, timing, payment method, and “has read class and index”.

**Ticket `EC-APP-1-API-M2`.** Declaration fields on create, stored and read back as written, with no score.

### M3 — the seller writes the rule; it orders and does not exclude

No “owner’s rule” resource on the listing or the profile. Thread messages are ordered by `createdAt` ascending, but that is not a rule the seller wrote, and it is not shown on the listing.

**Ticket `EC-APP-1-API-M3`.**

### V1 — published hours

**Present.** `POST /listings/:listingId/availability` with weekly windows (`weekday`, `startMinutes`, `endMinutes`, `capacity`). `GET /listings/:listingId/slots` is public and generates slots from those windows (`apps/api/src/viewings/viewings.service.ts`). No ticket for the existence of the windows.

### V2 — identity before confirmation

`BookDto` is `{ startMs, enquiryId? }`. `confirm` calls `transition(..., 'CONFIRM')` with no document or identity check. A `phone-verify` module exists. It is not wired to viewing confirmation.

**Ticket `EC-APP-1-API-V2`.**

### V7 — safety conditions as a booking constraint

No field and no check in viewings.

**Ticket `EC-APP-1-API-V7`.**

### No outcome on a viewing

The schema has an outcome. `ViewingStatus` is `REQUESTED | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW`. Events `COMPLETE` and `NO_SHOW` are exposed to the conductor (`POST /viewings/:id/complete`, `POST /viewings/:id/no-show`) and to the seller (`seller-viewings.controller.ts`). There is no column named `outcome`. The status is the outcome.

The mobile app does not read `NO_SHOW` / `COMPLETE` (no occurrences under `apps/mobile`). The API does. A schema test “no viewing has an outcome” **would fail today**.

**Ticket `EC-APP-1-API-VISIT-STATUS`.**

### Energy class and index on every card

Write path: `listings.service.publish` calls `assertEnergyAdvertComplete`. Without both class **and** index, publish returns 400. That is the R4 gate on the way out.

Read path, which is what the app receives:

- the search pin (`ListingPin`) has nullable `energyClass` and **no index**;
- Phase 21 detail has `energy.present`, nullable `energyClass`, nullable `performanceKwhM2Y`, and is served even when incomplete;
- listings published before the gate remain readable.

The app today (`ListingCard`) shows neither class nor index. The detail screen colours the class (`ENERGY_COLORS` in `app/listing/[slug].tsx`). Those colours sit on the class, not on the price.

**Ticket `EC-APP-1-API-R4-READ`.** The publish gate is not enough: search and detail still deliver incomplete cards. The brief says the app must not render them. The read filter is API work.

`[[BUCO: elenco cause di esenzione APE]]` is already in `packages/shared/src/energy-advert.ts`. It is not filled here.

### OMI as a fact, never as a judgement

`GET /listings/:slug/valuation-band` returns anchors `selling`, `fairMarket`, `outOfMarket` and a `side` of `below | in_band | above` (`apps/api/src/avm/domain/valuation-band.ts`). That is a judgement on the price, not the quadruple band / zone / semester / source.

Seller analytics expose `priceVsOmiBandPct`. Nudges include `ABOVE_OMI_BAND` and `BELOW_OMI_BAND`. Raw quotes live in `omi_quotes` / `omi_zone_quotes`, not on the public listing DTO.

**Ticket `EC-APP-1-API-OMI-FACT`.** A public DTO that is only band, zone, semester, and source. Do not reuse the current valuation-band on the listing card as it stands.

### Tier 3 — an agent who opens the door

There is no list of enrolled agents, with REA and VAT number, chosen by the seller, ordered only by a published criterion, with no platform fee.

`VIEWING_ACCOMPANIMENT` is in the catalog source, `active: false`, fixed price 4900 cents. That is not the brief’s tier 3. The `(pro)/` group is an assignment inbox, not that choice.

**Ticket `EC-APP-1-API-TIER3`.**

---

## 5. Already true — do not rebuild it

- Corporate state `PONTE`: the public catalog does not list `provvigione` rows (`publicCatalog` in `catalog.ts`).
- `VIEWING_ACCOMPANIMENT`, `FULL_MEDIATION`, `BUYER_MEDIATION`, and `OFFER_DRAFTING` are `active: false`.
- A quote in `PONTE` rejects a `provvigione` line (`pricing.ts`).
- Publish rejects a missing class or index.
- The seeker viewing projection does not contain the conductor’s phone.
- UUID detail does not contain the phone.

---

## 6. What this PR does not do

- It does not upgrade Expo.
- It does not remove Banks4All, `QUALIFIED`, `offer`, `provvigione`, `VIEWING_ACCOMPANIMENT`, or `easycasa.it` from the app. They are present. The PR 2 scan, and the PR 1 domain edit, are later PRs.
- It does not build the two shells or screen 01.
- It does not pick SDK 55 or 56. That sentence belongs to PR 1, and PR 1 starts only after this census is read.
- It does not write to the Kaizen or Startup boards: the brief assigns neither one of the four categories nor a phase 1–6.
- There is no `task_<hex>`. The ledger uses the code `EC-APP-1` with a null bridge id.
