# EC-S Private Seller — remaining work to close the roadmap

**Date:** 2026-08-13  
**Repo tip:** `c6e4fdc` · **API image:** `fa63487` · **Web rebuilt:** 2026-08-13T06:06Z (T33)  
**VPS verified:** `NEXT_PUBLIC_DEMO_MODE=false` · `INFORMATIVA_SELLER_VERSION=` (empty) · `DEMO_MODE=false`

Engineering for **T01–T33** is on `main` (T25 messaging HOLD). **G7 + T33 done.** What remains is almost entirely **human gates + enablement**.

Completion feedback: `docs/audits/EC-S-t33-completion-feedback.md`.

---

## Ordered unblock sequence

```
G7 ✅ ──► T33 ✅ (merged #140, web deployed)
G1 = counsel T02/T04/T05 + set INFORMATIVA_SELLER_VERSION
       └──► seller collection / onboarding enablement
Claims 7–8 counsel ──► LISTING_BOOST / PARTNER_DIRECTORY flips
Stripe Price IDs ──► premium (+ optional boost Price IDs) before monetisation flip
Dual inbox flags + web rebuild ──► seller inbox live (after G1)
```

Do **not** flip seller/monetisation flags before the matching gate.

---

## 1. G7 — unset demo mode → unlock T33 ✅ DONE

| | |
|---|---|
| **Owner** | Ops |
| **Action** | On VPS `/opt/easycasa-ita/.env`: set `NEXT_PUBLIC_DEMO_MODE=false`. Rebuild **web** so the build-time flag lands. Confirm sitewide `noindex` gone. |
| **Verified** | `.env` + web container `NEXT_PUBLIC_DEMO_MODE=false`; `curl https://easycasaita.com/it` → **no** `noindex`; `robots.txt` → `Allow: /` + sitemap; no demo banner |
| **Then** | ~~Dispatch T33~~ → **done** (K EC 1.46 / #140) |

**Current:** `NEXT_PUBLIC_DEMO_MODE=false`; T33 web image live at tip `c6e4fdc`.

---

## 1b. T33 — SEO wiring ✅ DONE

| | |
|---|---|
| **PR** | [#140](https://github.com/aziz-mubasher/EasyCasa/pull/140) · tip `c6e4fdc` |
| **Shipped** | `serializeJsonLd` everywhere; FAQPage+Service on sell-privately; RealEstateListing on listings; honest sitemap; CI `check:json-ld-escape` |
| **Residual** | Lighthouse SEO ≥95 — **done** (100 / 100 / 100). Record: `docs/audits/EC-S-t33-lighthouse-scores.md`. Listing meta fix tip `1f1269b`. |

---

## 2. G1 — counsel T02 / T04 / T05 + informativa version

| | |
|---|---|
| **Owner** | Counsel / DPO → then Ops |
| **Packets** | `docs/legal/ec-s-t02-counsel-review-packet.md` · `docs/legal/T04_mediazione_boundary.md` · `docs/legal/ec-s-t05-seller-data-memo.md` |
| **Sign-off** | Approve (or amend) Claims 1–6 + boundary matrix + Layer 1 informativa text |
| **Ops after sign** | Set `INFORMATIVA_SELLER_VERSION` to a parseable value (`v1.0` style — see `@easycasa/shared` consent helpers). Empty string **refuses** seller onboarding accept. |
| **Then (product)** | Consider `SELLER_ONBOARDING_ENABLED=true` and other seller feature flags per G1 checklist — still one flag at a time |
| **Ledger** | After counsel: may flip `savingsFigures` / `mediazioneCopy` from `fallback` → `live` in `promises.json` (separate eng PR) |

**Current:** `INFORMATIVA_SELLER_VERSION` empty on VPS.

---

## 3. Counsel Claims 7–8 → boost / directory flags

| | |
|---|---|
| **Owner** | Counsel |
| **Packet** | `docs/legal/ec-s-t02-claims-7-8-addendum.md` |
| **Claim 7** | Boost label “In evidenza” / paid-placement disclosure |
| **Claim 8** | Partner directory “Elenco informativo — nessuna commissione” (+ future monetised labelling) |
| **Then Ops** | `LISTING_BOOST_ENABLED=true` and/or `PARTNER_DIRECTORY_ENABLED=true` only after approved IT master labels; rebuild **api** (and **web** if UI chrome depends on build) |
| **G3 row 9** | Still blocks **paid** partner referral variants — v1 directory is informational only |

---

## 4. Stripe Price IDs

| | |
|---|---|
| **Owner** | Ops / Stripe Dashboard |
| **Boost** | Optional: `STRIPE_PRICE_BOOST_7D` / `STRIPE_PRICE_BOOST_30D` — empty → Checkout `price_data` with flat cents from shared `BOOST_FLAT_PRICE_CENTS` |
| **Premium** | Required for purchasable `seller_premium`: set `plans.stripe_price_id` (seed in migration `0061` may lack live Price ID) · then `SELLER_PREMIUM_ENABLED=true` |
| **Before flip** | Confirm flat-fee / success-independent (T04 row 8); webhook → local `seller_subscription` only |

---

## 5. Inbox enablement (dual flag)

| | |
|---|---|
| **Owner** | Ops (after **G1**) |
| **Flags** | `SELLER_INBOX_ENABLED=true` **and** `NEXT_PUBLIC_SELLER_INBOX_ENABLED=true` |
| **Rebuild** | **web** required for the public flag; **api** recreate/restart so API flag is read |
| **Route** | `/{locale}/seller/enquiries` (404 while either flag false) |
| **Do not** | Enable before G1 / informativa version is set |

---

## Still HOLD (not in your five — keep on the board)

| Item | Why |
|------|-----|
| **T25** in-portal messaging | T05 §6.5 controllership |
| **T19.2** dup-enforce + suspend UX | LIA |
| **P3 / P6 / P7 ledger flips** | Counsel + feature flags (`VERIFIED_OWNER_*`, checklist, analytics) |
| **Bunny CDN (`MEDIA_CDN_ENABLED`)** | DPA / T10 partial |

---

## Suggested Kaizen / Bridge sequencing

| Step | Board | Who | Cursor eng? |
|------|-------|-----|-------------|
| A | Ops: G7 DEMO_MODE off + web rebuild | Ops | No (or ops agent only) |
| B | Dispatch **T33** SEO wire | Eng | **Yes** — after A |
| C | Counsel T02/T04/T05 + Claims 7–8 | Counsel | No |
| D | Ops: `INFORMATIVA_SELLER_VERSION` + Stripe Prices | Ops | No |
| E | Ops: dual inbox flags + rebuilds | Ops | No |
| F | Optional: ledger `fallback`→`live` copy PR | Eng | Yes — after C |
| G | Optional: monetisation / VO / checklist / analytics flips | Ops+product | No code if already built |

---

## One-liner for Claude / Bridge

> EC-S eng track is closed except **T33** (blocked on **G7**) and HOLDs **T25/T19.2**. Humans own counsel (T02/T04/T05 + Claims 7–8), informativa version, Stripe Prices, and dual-flag enablement. Do not double-dispatch enablement as eng tasks.
