# LGL-1 — Counsel Packet Addendum: "Legenda" feature

**For:** the GDPR counsel packet currently being bundled (informativa, consent copy IT/EN/ES, data inventory, sub-processors, legal-basis questions, Art. 37 DPO question, controller structure).  
**From:** EasyCasa R&D · 10 Aug 2026 · Status: to be bundled by AZM with the main packet — one counsel round.  
**Feature summary for counsel:** EasyCasa will let users upload Italian judicial-auction documents (perizia CTU, avviso di vendita, ordinanza, planimetrie) and receive an automated informational analysis (structured report, risk indicators, comparison with official OMI values), multilingual, with a paid tier. Documents are stored in EasyCasa-controlled object storage (MinIO, on EasyCasa's VPS infrastructure).

---

## Q-A1 — Third-party personal data inside uploaded court documents

Perizie and sale notices contain personal data of third parties, principally the esecutato/debtor (name, address, property and debt details), and sometimes occupants or neighbours. These are publicly accessible court documents (published via pvp.giustizia.it and tribunal portals), uploaded to us by a prospective bidder, not by the data subject.

1. What is the correct legal basis for processing this third-party personal data (Art. 6(1)(f) legitimate interest is our working assumption — confirm and define the balancing test record we should keep)?
2. Are there Art. 14 information obligations toward the esecutato, and if so does the Art. 14(5)(b) disproportionate-effort exemption apply?
3. Proposed mitigation to validate: automated masking of the esecutato's name and personal identifiers in all generated report outputs (source documents stored unmodified, outputs masked). Is this sufficient, required, or unnecessary?
4. Any constraints from Italian rules on re-use of judicial documents / provvedimenti (e.g. Art. 52 d.lgs. 196/2003 considerations) applicable to an analysis service?

## Q-A2 — Retention of uploaded auction documents

Proposed: uploaded documents and derived analysis data retained while the user account is active, auto-deleted N days after last activity or on user deletion (user-initiated deletion available at any time; cascade includes storage objects). Please advise the appropriate N (we have provisionally configured 365 days) and whether the derived analysis (extracted data, embeddings for document search) follows the same clock.

## Q-A3 — Professional-boundary review of output disclaimers

The report is an automated informational document analysis. It is NOT: a perizia/valuation (reserved professional activity), legal advice, or mediation under L. 39/1989. Please review and finalize, in IT/EN/ES:

1. The standing disclaimer that will appear on every report, report PDF, chat answer, and the `/aste` pages (current draft: "EasyCasa fornisce analisi documentali a scopo informativo. Non fornisce consulenza legale, tecnica o perizie ai sensi di legge.").
2. The refusal boundary for the document-Q&A chat (it answers only from the uploaded documents and declines requests for legal advice).
3. The multilingual legal glossary (~12 core auction terms, neutral one-line definitions, IT/EN per audience register) — one-time review; definitions are then locked and reused verbatim in all outputs.

## Q-A4 — Future paid assistance services (advance question, not launching now)

We may later offer human services around auctions: telephone consultation, assistance preparing/submitting the offerta telematica, end-to-end support — via external professionals (network being recruited). Which of these, if any, fall under L. 39/1989 mediation or other reserved-activity regimes, and what structure (referral vs. intermediation vs. platform contract) keeps EasyCasa outside the reserved perimeter?

## Q-A5 — Anonymous marketing leads (`aste_leads`) and data-subject rights

The `/aste` landing page (already live, EC-21) collects email + language + province + buyer-type from people who are NOT registered users, under consent for receiving a guide and service updates. Repo finding: our generic DSAR tooling serves authenticated users (`/me`); these email-only records sit outside it.

1. Confirm the consent text used (currently marked counsel-pending in the page).
2. What access/erasure process is adequate for these records — is a documented manual process on email request sufficient, and what response SLA should we commit to?
3. Should these records auto-expire if the service does not launch or the address never converts (proposed: 24 months from collection or last interaction)?

## Q-A6 — Data inventory & sub-processor updates (for the packet's existing sections)

Add to the inventory: `aste_leads` (email, language, province, buyer type, consent record); `aste_analyses` + `aste_documents` + derived extraction/embeddings (user-tied); uploaded court documents (containing third-party PII per Q-A1). New processing purpose: automated document analysis for auction due-diligence. Sub-processor note — now concrete: the AI provider is **OpenAI** (OpenAI-compatible API, model `gpt-4o-mini`), receiving document text (which contains third-party PII per Q-A1) for extraction and translation. OCR runs locally (Tesseract, on EasyCasa infrastructure — no third party). Counsel to advise: OpenAI DPA adequacy for this use, EU-region processing requirements, whether an EU-resident alternative is required, and the resulting informativa/sub-processor-list entries.

---

*Prepared by R&D. All quoted disclaimer/consent texts remain marked counsel-review-pending until sign-off.*
