# Phase 19 — Feature-Gap Matrix: EasyCasa vs immobiliare.it · idealista.it · Zillow

*Grounded in current (2026) portal feature sets. EasyCasa columns reflect the live site (easycasaita.com) and what Phases 7–18 built.*

## How to read this

- **immo / idea / Z** = immobiliare.it, idealista.it, Zillow — the reference portals.
- **EC live** = what's on easycasaita.com today. **EC built** = shipped in Phases 7–18 (may not be surfaced on the live site yet).
- ✓ = has it · ◐ = partial / thin · — = absent.

---

## The matrix

### A. Discovery & search  *(the portals' core strength — EasyCasa's biggest gap)*

| Feature | immo | idea | Z | EC live | EC built | Priority |
|---|---|---|---|---|---|---|
| Advanced filters (price, type, rooms, m², year, energy class) | ✓ | ✓ | ✓ | — | ◐ (P7 shell) | **P0** |
| Draw-on-map / area search | ✓ | ✓ | ✓ | — (promised) | — | **P0** |
| Map clustering / "search as I move" | ✓ | ✓ | ✓ | — | — | **P0** |
| Catastal search (foglio/particella, riferimento) | ◐ | ✓ | n/a | ◐ (hinted) | — | P1 |
| Natural-language / AI search | ◐ | ◐ | ✓ (AI mode, 2026) | — | — | P2 |

### B. Listing detail

| Feature | immo | idea | Z | EC live | EC built | Priority |
|---|---|---|---|---|---|---|
| Rich photos + gallery | ✓ | ✓ | ✓ | — | ◐ (P7 detail) | **P0** |
| Floor plans (planimetria) | ✓ | ✓ | ✓ | — | — | P1 |
| 3D / virtual tours, video | ◐ | ◐ | ✓ (Showcase, SkyTour) | — | — | P2 |
| Energy class / APE on listing | ✓ | ✓ | n/a | — | ✓ (fascicolo) | **P0** ← easy win |
| Price / tax history | ◐ | ◐ | ✓ | — | — | P2 |
| Neighborhood data (transport, schools, €/m²) | ◐ (OMI zones) | ✓ (idealista/maps) | ✓ (Trulia) | — | — | P1 |

### C. Alerts & saved

| Feature | immo | idea | Z | EC live | EC built | Priority |
|---|---|---|---|---|---|---|
| Favorites | ✓ | ✓ | ✓ | ✓ | ✓ (P7) | done |
| Saved searches (named) + email/push alerts | ✓ | ✓ | ✓ (minutes) | — | — | **P0** |
| Shared collections (partner) | — | — | ✓ (2026) | — | — | P3 |

### D. Valuation (AVM)  *(all three have free instant estimates; EasyCasa doesn't)*

| Feature | immo | idea | Z | EC live | EC built | Priority |
|---|---|---|---|---|---|---|
| Free instant AVM | ✓ (Mia Casa) | ✓ (min/mid/max) | ✓ (Zestimate) | — | — | **P1** ★ |
| Photo-based / guided estimate | ◐ | ◐ | ✓ | — | — | P3 |
| Paid professional valuation | via agency | via agency | via agent | — | ✓ (catalog service) | done |

★ The free AVM is both a table-stakes portal feature **and** the top-of-funnel that feeds EasyCasa's *paid* valuation service and mandate flow.

### E. Financing

| Feature | immo | idea | Z | EC live | EC built | Priority |
|---|---|---|---|---|---|---|
| Mortgage calculator | ✓ | ✓ | ✓ | — | — | P2 |
| Mortgage brokerage / pre-approval (revenue) | ✓ (Mutui — paid by banks) | ◐ | ✓ (Home Loans, verified) | — | — | P2 ★ revenue |

### F. Contact, viewings & transaction  *(EasyCasa's moat — the portals stop at lead-gen)*

| Feature | immo | idea | Z | EC live | EC built | Priority |
|---|---|---|---|---|---|---|
| Contact lister / message agent | ✓ | ✓ | ✓ | — | ◐ | **P0** |
| Viewing / appointment booking | ◐ | ◐ | ✓ (tour scheduling) | — | — | **P1** |
| End-to-end transaction (order→mandate→registration) | — | — | — | — | ✓ (P8–12) | **moat** |
| Payments + fattura elettronica | — | — | — | — | ✓ (P17–18) | **moat** |
| Cedolare / RLI / AML rental compliance | — | — | — | — | ✓ (P12) | **moat** |
| À-la-carte / commission-free services | — | — | — | ✓ (msg) | ✓ (P8) | **moat** |

### G. Supply-side (agent/agency tools)

| Feature | immo | idea | Z | EC live | EC built | Priority |
|---|---|---|---|---|---|---|
| Pro CRM (leads, mandato, calendar, stats) | ✓ | ✓ (idealista/tools) | ✓ (Premier Agent) | — | ◐ (P13/P15) | P2 |
| Credential-gated assignment / deliverables | — | — | — | — | ✓ (P11/P15) | **moat** |
| Verified/compliance listings (APE-gated) | ◐ | ◐ (quality score) | ◐ | — | ✓ (P8 gates) | advantage |

### H. Platform

| Feature | immo | idea | Z | EC live | EC built | Priority |
|---|---|---|---|---|---|---|
| iOS / Android / web apps | ✓ | ✓ | ✓ | ◐ (web) | ✓ (P7 universal) | ◐ surface it |
| Multilingual (IT/EN/ES) | ◐ | ✓ (IT/ES/PT) | — | ✓ | ✓ | advantage (expat) |

---

## What the matrix says

**The gap is almost entirely the consumer discovery layer.** immobiliare, idealista, and Zillow are discovery + lead-gen engines with an AVM bolted on. EasyCasa has built the opposite: the transaction, compliance, and services spine those portals deliberately don't have — but the acquisition funnel that feeds it (map search, listing detail, alerts, valuation) is thin or unbuilt, and the live homepage is *promising* exactly that ("search the map across thousands of homes").

**The moat is real — protect it, don't rebuild the portals.** EasyCasa should not try to out-Zillow Zillow on listing volume. Its reason to exist is the end-to-end licensed-agency transaction (mandate → RLI/cedolare/AML → payment → fattura) that none of the three do. The discovery layer is the *front door* to that moat, not the product itself.

---

## Prioritized build order

**P0 — close the live promise (table stakes; the homepage already sells these):**
1. Map-search backend — geo bounds, clustering, draw-to-search over PostGIS/Meilisearch (P7 stubbed the client).
2. Filters (price, type, rooms, m², **energy class/APE** — EasyCasa already has APE data, an easy differentiator).
3. Listing-detail surface (gallery, key facts, APE, map).
4. Saved searches + alerts (email/push; P7 already has device registration).
5. Contact-lister / enquiry flow into the existing order funnel.

**P1 — differentiate & feed the funnel:**
6. **Free instant AVM** (OMI + comparables) — table stakes *and* the lead magnet into the paid valuation + mandate flow.
7. Viewings/appointment booking (the missing core RE flow; ties seeker ↔ owner ↔ professional calendars).
8. Neighborhood/area data (OMI €/m², transport, schools).

**P2 — revenue & polish:**
9. Mortgage calculator + brokerage partner (the immobiliare-Mutui model: free to users, paid by lenders).
10. Floor plans / virtual tours on listings.
11. Natural-language / AI-assisted search (Zillow's 2026 direction).

---

## Strategic decision (resolved in this phase)

The live site said **"zero commission / no middleman,"** but Phases 8–18 built a **licensed mediator** that charges à-la-carte fees + a provvigione on success.

**Aligned messaging:** no traditional agency commission — pay only for the services you use (and a success fee when a deal closes). Homepage copy (EN/IT/ES) was updated accordingly before scaling discovery acquisition.

---

## Shipped in Phase 19

- This matrix checked into `docs/phase-19.md`.
- Homepage brand/hero copy reconciled with the mediator + à-la-carte + provvigione model.

P0 discovery work is **not** in this phase — pick one item from the build order for the next focused PR.
