# T02 Counsel Packet — Addendum: Claims 7–8 (Phase 4 commercial surfaces)

**Status:** TEMPLATE FOR COUNSEL REVIEW — extends the T02 packet (Claims 1–6). Both features are merged, flag-gated off; labels below are what will render when flags flip. Submit together with the main packet / gate tracker.

**Parent packet:** [`ec-s-t02-counsel-review-packet.md`](./ec-s-t02-counsel-review-packet.md)  
**Related:** T04 matrix row 8 (flat fee, success-independent); G3 row 9 (partner monetisation HOLD).

## Claim 7 — Boosted-listing label ("In evidenza")

**Context:** paid visibility boost (flat fee, 7/30 days, success-independent — T04 row 8 compliant). Boost affects search ranking via a bounded weight; the label renders wherever ranking is affected (list + detail). i18n key `listingBoost.inEvidenza`; visually distinct `spotlight` token, deliberately separated from trust chips.

**Proposed labels:** IT `In evidenza` · EN `Featured` · ES `Destacado`.

Supporting i18n (already shipped, flag-off):

| Key | IT |
|-----|-----|
| `listingBoost.inEvidenza` | In evidenza |
| `listingBoost.inEvidenzaAria` | Annuncio in evidenza a pagamento |
| `listingBoost.directoryNote` | Contenuto pubblicitario — posizionamento a pagamento |

**Questions for counsel:**

13. Does `In evidenza` alone satisfy paid-placement transparency (Codice del Consumo art. 22-bis on paid rankings, DSA Art. 26(2) ad identification, AGCM guidance on evidenza a pagamento), or is explicit "annuncio in evidenza a pagamento" (or a disclosure on tap/hover) required?
14. Must the ranking methodology disclosure (main parameters of ranking incl. the paid factor, P2B/DSA transparency) be published, and where — footer page, search-results info link, or both?

**Counsel decision (Claim 7):**  
- [ ] Approve IT master label as-is (`In evidenza`)  
- [ ] Require stronger wording: _______________  
- [ ] Placement / disclosure requirements: _______________  
- [ ] May flip `LISTING_BOOST_ENABLED` → `true` with this label: ☐ yes ☐ no — date/name: _______________

---

## Claim 8 — Partner directory labelling

**Context:** informational directory of notai/geometri/APE certifiers per province. v1 has NO fees, no conversion tracking, no preferential ordering; outbound links stripped of tracking params. Label: `Elenco informativo — nessuna commissione` (`partnerDirectory.informationalLabel`).

**Questions for counsel:**

15. Is the v1 label sufficient, or must we add that EasyCasa neither endorses nor guarantees the listed professionals?
16. For the future monetised variant (flat listing fee for partners — awaiting the G3 row 9 answer): required labelling delta ("presenza a pagamento"?) and any ordering-disclosure duty. Answer may be folded into the G3 row 9 opinion.

**Counsel decision (Claim 8):**  
- [ ] Approve v1 IT master label as-is  
- [ ] Amend label: _______________  
- [ ] Endorsement / non-guarantee disclaimer required: ☐ yes ☐ no — text: _______________  
- [ ] Monetised-variant labelling (for G3 row 9): _______________  
- [ ] May flip `PARTNER_DIRECTORY_ENABLED` → `true` with this label: ☐ yes ☐ no — date/name: _______________

---

**Requested deliverable:** approved label text per claim (IT master) + placement requirements; confirmation of which may go live with which gate.
