# EC-S Private Seller — remaining work to close the roadmap

**Date:** 2026-08-13  
**Repo tip:** `d4ad149` · **API image:** `fa63487` (env-driven) · **Web rebuilt:** G1 inbox bake  
**VPS verified:** `NEXT_PUBLIC_DEMO_MODE=false` · `INFORMATIVA_SELLER_VERSION=v1.1` · `SELLER_ONBOARDING_ENABLED=true` · dual inbox **true** · `DEMO_MODE=false`

Engineering for **T01–T33** is on `main` (T25 messaging HOLD). **G7 + T33 + G1 enablement done.** Remaining: counsel Claims 7–8, Stripe Prices, optional ledger copy flip, HOLDs.

Completion feedback: `docs/audits/EC-S-g1-completion-feedback.md` · `docs/audits/EC-S-t33-completion-feedback.md`.

---

## Ordered unblock sequence

```
G7 ✅ ──► T33 ✅
G1 ✅ (T02/T04/T05 signed · INFORMATIVA=v1.1 · onboarding + dual inbox ON)
Claims 7–8 counsel ──► LISTING_BOOST / PARTNER_DIRECTORY flips
Stripe Price IDs ──► premium (+ optional boost Price IDs) before monetisation flip
Optional: savingsFigures / mediazioneCopy → live (dedicated PR)
```

Do **not** flip monetisation / VO / analytics flags before the matching gate.

---

## 1. G7 — unset demo mode → unlock T33 ✅ DONE

| | |
|---|---|
| **Owner** | Ops |
| **Action** | On VPS `/opt/easycasa-ita/.env`: set `NEXT_PUBLIC_DEMO_MODE=false`. Rebuild **web** so the build-time flag lands. Confirm sitewide `noindex` gone. |
| **Verified** | `.env` + web container `NEXT_PUBLIC_DEMO_MODE=false`; `curl https://easycasaita.com/it` → **no** `noindex`; `robots.txt` → `Allow: /` + sitemap; no demo banner |
| **Then** | ~~Dispatch T33~~ → **done** (K EC 1.46 / #140) |

**Current:** `NEXT_PUBLIC_DEMO_MODE=false`; T33 web image live.

---

## 1b. T33 — SEO wiring ✅ DONE

| | |
|---|---|
| **PR** | [#140](https://github.com/aziz-mubasher/EasyCasa/pull/140) · tip `c6e4fdc` |
| **Shipped** | `serializeJsonLd` everywhere; FAQPage+Service on sell-privately; RealEstateListing on listings; honest sitemap; CI `check:json-ld-escape` |
| **Residual** | Lighthouse SEO ≥95 — **done** (100 / 100 / 100). Record: `docs/audits/EC-S-t33-lighthouse-scores.md`. Listing meta fix tip `1f1269b`. |

---

## 2. G1 — counsel T02 / T04 / T05 + informativa version ✅ DONE

| | |
|---|---|
| **Sign-off** | AZM 2026-08-13 — `docs/audits/EC-S-g1-signoff-enablement.md` |
| **Version** | `INFORMATIVA_SELLER_VERSION=v1.1` |
| **Flags** | `SELLER_ONBOARDING_ENABLED=true` · `SELLER_INBOX_ENABLED=true` · `NEXT_PUBLIC_SELLER_INBOX_ENABLED=true` (Docker build-arg) |
| **Verified** | `/api/seller/me` + `/api/seller/enquiries` → **401**; `/it/seller/enquiries` → **Richieste** UI; sell-privately still **fallback** copy |
| **Feedback** | `docs/audits/EC-S-g1-completion-feedback.md` |

**Ledger note:** `savingsFigures` / `mediazioneCopy` stay **fallback** until a dedicated flip PR.

---

## 2b. Dual inbox enablement ✅ DONE (with G1)

Was blocked on G1; completed in the same ops pass. Docker ARG gap fixed in `d4ad149`.

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

## 5. Inbox enablement (dual flag) ✅ DONE

| | |
|---|---|
| **Flags** | Both true on VPS; web rebuilt with Docker build-arg (`d4ad149`) |
| **Route** | `/{locale}/seller/enquiries` live (sign-in panel) |
| **Note** | See §2 / `docs/audits/EC-S-g1-completion-feedback.md` |

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
