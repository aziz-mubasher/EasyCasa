# EC-S-T04 — Mediazione boundary matrix (TEMPLATE)

**Status:** TEMPLATE FOR COUNSEL REVIEW — not final.  
**Depends on / feeds:** [`ec-s-t02-counsel-review-packet.md`](./ec-s-t02-counsel-review-packet.md) Claim 2; gates T20–T29.  
**Entity:** Mundida S.r.l. (EasyCasa) — P.IVA IT04531990986  
**Question:** Which EasyCasa product behaviours stay outside *mediazione immobiliare* (L. 39/1989; Cod. civ. artt. 1754 ss.; Cass. on "messa in relazione"), and which require mediator enrolment / incarico / disclosure?

> Fill the **Counsel** column. Engineering fills **Product fact** from the live codebase. Do not treat any row as approved until counsel signs the T02 packet deliverable B.

---

## A. Positioning claims

| # | Claim / behaviour | Product fact (engineering) | Outside mediazione? (counsel) | Notes / required disclaimer |
|---|-------------------|----------------------------|-------------------------------|-----------------------------|
| A1 | “Siamo un portale, non un'agenzia immobiliare” | Proposed on Sell Privately; **fallback live**; gated by `mediazioneCopy` | ☐ yes ☐ no ☐ amend | |
| A2 | Existing mediation disclosure page | Live draft: `docs/legal/mediation-disclosure.md` — describes licensed mediator | ☐ reconcile with A1 | |
| A3 | “Zero commission / no % on sale” | P1 live on Sell Privately + elsewhere | ☐ yes ☐ no ☐ amend | |

## B. Feature set vs "messa in relazione"

| # | Feature | Status | Product fact | Outside mediazione? | If inside: required artefact |
|---|---------|--------|--------------|---------------------|------------------------------|
| B1 | Public listing catalogue + search | live | Listings API + `/search` | ☐ | |
| B2 | Enquiry / Contatta to owner | live | Consent-gated enquiry | ☐ | |
| B3 | Viewing scheduler (slots, confirm) | live EC-3–7 | Buyer books; seller/conductor confirms | ☐ | |
| B4 | Seller-as-conductor agenda | pending T21 | Extends B3 | ☐ | |
| B5 | OMI band display on listing / wizard | partial | Official zone ranges; “data not advice” | ☐ | |
| B6 | Verified Buyer badge (Banks4All) | live EC-1 | Sibling Mundida entity; attestation fields only | ☐ | |
| B7 | Verified Owner (visura) | coming T14–T16 | Document upload + moderation | ☐ | |
| B8 | In-portal messaging | pending T25 | Contact details withheld until seller shares | ☐ | |
| B9 | Optional paid services (photos, APE, boost) | catalogue | Fixed-price catalogue; `legal_basis` often `REVIEW_REQUIRED` | ☐ | |
| B10 | Full mediation / deal support SKU | catalogue | May be `mediazione` when classified | ☐ | |

## C. Where disclosure must appear

| Surface | Required? (counsel) | Proposed vehicle |
|---------|---------------------|------------------|
| Sell Privately info page | ☐ | Claim 2 block / footer |
| Every listing detail page | ☐ | Banner / footer snippet |
| Enquiry / Contatta step | ☐ | Existing mediation disclosure gate |
| Viewing booking | ☐ | |
| Seller publish wizard | ☐ | |
| Optional service checkout | ☐ | Incarico / terms |

## D. Sign-off

| Field | Value |
|-------|-------|
| Counsel name / firm | |
| Date | |
| Matrix approved | ☐ yes ☐ yes with amendments attached |
| Blocks Claim 2 flip (`mediazioneCopy` → `live`) | ☐ yes ☐ no |

*End of T04 template.*
