# Privacy Policy — EasyCasa (TEMPLATE — NOT LEGAL ADVICE)

> **This is a drafting template, not legal advice.** It must be reviewed and
> completed by a qualified Italian/EU data-protection lawyer or your DPO before
> publication. Bracketed `[…]` fields need real values. Requirements vary; do not
> publish as-is.

**Data controller:** [EasyCasa legal entity], [address], P.IVA [EASYCASA_PIVA].
**Contact / DPO:** [privacy@easycasaita.com].
**Version:** [v1] — [date]. (The version string is stored with each consent record.)

## 1. What we collect (seeker pilot scope)
- **Account/identity:** name, email (via the identity provider / Keycloak).
- **Enquiries:** the listing, your message, contact details, timestamp.
- **Viewings:** the listing, chosen slot, timestamp.
- **Saved searches & alerts:** search criteria, alert frequency.
- **Technical:** IP (hashed for consent evidence), device/session data.

## 2. Why, and on what legal basis (Art. 6 GDPR)
- Handling your enquiry and arranging viewings — **contract / pre-contract** (6(1)(b)).
- Sending alerts you asked for — **consent** (6(1)(a)); withdraw any time.
- Mediation, invoicing, AML where a transaction proceeds — **legal obligation**
  (6(1)(c)) and legitimate interest, as applicable.
- Service security and abuse prevention — **legitimate interest** (6(1)(f)).

## 3. Sharing
Listing owners/agents (to answer your enquiry), and processors we use
(hosting/email/identity), under data-processing agreements. [Enumerate processors.]
We do not sell personal data.

## 4. Retention
- Unconverted enquiry leads: anonymized after **[90] days** (configurable).
- Data tied to a concluded transaction: retained per legal/fiscal obligations
  (invoicing, AML) — typically **[10] years** where required. [Confirm periods.]

## 5. Your rights (Art. 15–21)
Access, rectification, erasure, restriction, portability, objection. Exercise via
the in-app privacy area (export / erase) or [privacy@easycasaita.com]. Erasure is
honored except where we must retain data by law (you'll receive a report of what
was kept and why). You may complain to the **Garante per la protezione dei dati
personali**.

## 6. International transfers
[State whether any processor transfers data outside the EEA and the safeguards.]

## 7. Changes
Material changes bump the version and are re-consented where required.

## 8. Internal relationship management (CRM) — DRAFT (K EC 4.1)

> **Consent applied (2026-08-02)** by MUNDIDA S.r.l. for Art. 13 coverage + retention
> defaults (`docs/legal/COUNSEL-REVIEW-PACKAGE.md` §1.6 question 2a;
> `crm-controller-responsibility.md`). Production may enable via `CRM_ENABLED=true`.
> Bracketed legal bases and final IT/EN/ES polish remain open for counsel.

When enabled, EasyCasa (controller: MUNDIDA S.r.l.) may process contact and
pipeline data in an **internal CRM** used only by authorised staff, so we can
manage enquiries, viewings, and related follow-up across seekers, owners, and
partners.

- **Data categories:** name, email, phone, locale, source of contact, tags and
  operational notes; seeker/owner/partner pipeline stage; activity and task
  records; an append-only CRM audit log. Where a Banks4All affordability
  attestation is linked, only the Phase A fields are stored: attestation status,
  indicative maximum band, expiry date, and holder initials — not income,
  employment, bank, or credit data.
- **Purposes:** manage the commercial relationship arising from enquiries and
  viewings; coordinate staff tasks; account for staff access (Art. 5(2)
  accountability). Marketing follow-up beyond what is necessary for the
  requested service requires a separate marketing consent already recorded in
  our consent ledger.
- **Proposed legal basis:** [counsel to assign — working assumption: Art. 6(1)(b)
  for pre-contract / contract steps linked to an enquiry or viewing; Art. 6(1)(f)
  for internal operational coordination and audit where appropriate; Art. 6(1)(a)
  for optional marketing].
- **Recipients:** EasyCasa staff with a CRM role only. Not sold. Processors are
  the same hosting/email/identity stack as the rest of the platform.
- **Retention:** dormant seeker CRM profiles anonymised after **24 months**
  without qualifying activity (`CRM_DORMANT_RETENTION_MONTHS`) — confirmed for
  enablement by controller consent 2026-08-02. Soft-deleted contacts are removed
  on confirmed erasure / DSAR erase for the linked user. Audit log retained for
  accountability — [counsel may refine period].
- **Your rights:** same as §5. CRM rows linked to your account are included in
  export/erase when the feature is enabled.

**Controller note:** MUNDIDA S.r.l. accepts full legal responsibility as
controller for CRM personal data (`docs/legal/crm-controller-responsibility.md`).
