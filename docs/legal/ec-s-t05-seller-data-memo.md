# EC-S-T05 — Seller-Side Data Protection Memo + Informativa Extension

**Status:** G1 SIGNED (AZM 2026-08-13) — Layer 1 may ship; version `v1.1`. §6.5/T25 and Bunny DPA remain open. See `docs/audits/EC-S-g1-signoff-enablement.md`.  
**Entity:** Mundida S.r.l. / Mundida group (P.IVA IT04531990986) — EasyCasa (easycasaita.com)  
**Lesson applied:** informativa valid and versioned **before** collection begins (Contatta precedent). No seller-side field ships before this memo's informativa section is approved and versioned in the consent ledger (**T30**).

**Related:** [`privacy-policy.md`](./privacy-policy.md) (v1-draft) · [`COUNSEL-REVIEW-PACKAGE.md`](./COUNSEL-REVIEW-PACKAGE.md) · [`ec-s-t02-counsel-review-packet.md`](./ec-s-t02-counsel-review-packet.md) · roadmap `docs/ec-s-roadmap.md`

---

## 1. Data inventory — private seller track

| Category | Fields | Source task | Storage | Retention (proposed) |
|----------|--------|-------------|---------|----------------------|
| Seller identity | name, surname, email, phone, Keycloak subject id | T06 | PostgreSQL + Keycloak | account life + 12m post-deletion (legal defence), then erasure |
| Property identifiers | address, foglio/particella/subalterno, OMI zone | T07/T08 | PostgreSQL | listing life + 24m (dispute window) |
| Verification documents | visura catastale, atto di provenienza, APE, planimetria | T14/T18 | MinIO (private bucket, **never public**) | verification outcome + 12m; originals deleted on account deletion |
| Listing media | photos (EXIF stripped at ingest — locked), virtual tours | T10 | MinIO → Bunny.net CDN | listing life; content-addressed immutable keys (locked) |
| Behavioural | listing views, saves, enquiry rate (aggregated for seller analytics) | T23 | PostgreSQL | aggregates non-personal; raw events 14m |
| Communications | seller↔buyer messages | T25 | PostgreSQL | 24m post-listing-close (proposed — counsel to confirm vs. 12m) |
| Payment | Stripe customer/payment ids for optional services | T26–27 | Stripe (processor) | per fiscal retention, 10y invoices |

**Counsel retention decision (§1):** ☐ approve as proposed · ☐ amend table attached

---

## 2. Lawful bases (proposed, per Art. 6)

| Processing | Basis | Note |
|------------|-------|------|
| Account + listing publication | 6(1)(b) contract | Publication is the requested service — no consent checkbox (Art. 6(1)(b) pattern per B4A-3 learning) |
| Owner verification (visura matching) | 6(1)(b) + 6(1)(f) fraud prevention | LIA required for the anti-fraud component (duplicate detection T12, abuse controls T19) |
| Buyer badge display to seller | 6(1)(b) | Data is the buyer's; cross-controller determination below |
| Seller analytics dashboard | 6(1)(b) | Own-listing metrics only |
| Marketing communications to sellers | 6(1)(a) consent | Separate, unticked, ledger-linked to policy version |
| Moderation (human review of listings/documents) | 6(1)(b) + 6(1)(f) | Include in informativa transparency section |

**Counsel bases decision (§2):** ☐ approve · ☐ amend: _______________

---

## 3. Controller determinations (for counsel)

1. **Seller↔buyer messages (T25):** EasyCasa as controller for transport metadata; content — controller or mere hosting? Position affects retention and access-request scope.
2. **Buyer badge shown to seller (T20):** joint controllership with Banks4All for the display event? Aligns with the pending cross-controller counsel consent for Phase B/C — fold into that same review.
3. **Verification documents:** EasyCasa sole controller; moderation staff access on least-privilege, logged.

| # | Counsel position |
|---|------------------|
| 3.1 Messages | ☐ controller for content · ☐ hosting / Art. 2 hosting carve-out · ☐ other: ___ |
| 3.2 Badge display | ☐ EasyCasa sole · ☐ joint with Banks4All · ☐ Banks4All sole + EasyCasa processor · ☐ other: ___ |
| 3.3 Visura/docs | ☐ EasyCasa sole controller (proposed) · ☐ amend: ___ |

---

## 4. Sub-processors (delta to existing inventory)

No new ones beyond the known set (Keycloak self-hosted, MinIO self-hosted, Meilisearch self-hosted, Bunny.net planned, Stripe, Brevo).

**Gate:** Bunny.net DPA must be executed before **T10** goes live with seller media.

| Processor | Role | DPA status |
|-----------|------|------------|
| Bunny.net | CDN / media delivery | ☐ executed — date: ___ · ☐ blocked (T10) |
| Stripe | Optional paid services | ☐ already covered · ☐ extend |
| Brevo | Transactional email | ☐ already covered · ☐ extend |

---

## 5. Informativa extension — draft copy (IT, layered per EDPB; EN mirrors)

### Layer 1 (at listing creation form)

> Titolare: Mundida S.r.l., P.IVA IT04531990986. Trattiamo i tuoi dati e i documenti dell'immobile per pubblicare il tuo annuncio, verificarne l'autenticità e fornirti gli strumenti di vendita (base giuridica: esecuzione del contratto, art. 6.1.b GDPR; prevenzione frodi: legittimo interesse, art. 6.1.f). I documenti di verifica non sono mai pubblici. Conservazione, diritti e dettagli: [Informativa completa v{X.Y}].

**EN mirror (draft):**

> Controller: Mundida S.r.l., VAT IT04531990986. We process your data and property documents to publish your listing, verify authenticity, and provide selling tools (legal basis: performance of a contract, Art. 6(1)(b) GDPR; fraud prevention: legitimate interests, Art. 6(1)(f)). Verification documents are never public. Retention, rights and details: [Full notice v{X.Y}].

### Layer 2 additions (full informativa)

Sections to add to [`privacy-policy.md`](./privacy-policy.md) (and live `/legal/privacy`) once approved:

- Seller account and listing publication (6(1)(b))
- Verification-document handling (private storage, moderation access, never public)
- Moderation of listings / documents
- Message retention (pending §3.1 / §6.5)
- Optional-service payments via Stripe
- Buyer-badge provenance (Banks4All, gruppo Mundida) when shown to sellers
- Rights incl. portability of listing data
- Retention table aligned to §1 after counsel amend

### Versioning requirement

This extension **increments the policy version**; acceptance/consent records must link to that version id in the consent ledger (**T30**). Re-consent is not required for pure 6(1)(b) processing, but the **acceptance timestamp against version must be stored**.

**Proposed next version id after approval:** `v1.1` (parseable `major.minor`; earlier draft `v1.1-seller` rejected by consent grammar).

| Field | Value |
|-------|-------|
| Layer 1 approved | ☑ yes (AZM G1 2026-08-13) |
| Layer 2 outline approved | ☑ yes for planning — full privacy page copy still to be merged into live `/legal/privacy` as follow-up |
| Version string for T30 | `v1.1` |

---

## 6. Open questions for counsel/DPO

1. Retention figures in §1 — confirm or amend (esp. messages 24m and visura 12m).
2. LIA for fraud-prevention processing — counsel to review the drafted balancing test (to be produced with T12/T19 briefs).
3. Does document verification (visura) constitute processing of data relating to **third parties** (co-owners appearing in visura)? If so, informativa wording for third-party data.
4. **DPO requirement** reassessment (Art. 37): does systematic owner-document verification at scale change the prior assessment?
5. Message-content controllership (§3.1) — position wanted **before T25** build starts.

| # | Answer / reference |
|---|-------------------|
| 6.1 | |
| 6.2 | |
| 6.3 | ☐ third-party processing · wording: ___ |
| 6.4 | ☐ DPO still not required · ☐ appoint · ☐ other: ___ |
| 6.5 | (see §3.1) |

---

## 7. Ship gates encoded

| Task | Blocked until |
|------|----------------|
| **T06** seller onboarding | §5 Layer 1 approved + versioned |
| **T10** media pipeline | Bunny.net DPA executed (§4) |
| **T14 / T18** documents | §6.3 answered |
| **T25** messaging | §6.5 / §3.1 answered |
| **T30** consent ledger seller purposes | This memo + version string |

Engineering must not open seller collection UIs that persist new personal data categories until the relevant gate above is checked in the task PR.

**Promise ledger:** P8 remains `live` for marketplace positioning already true at T01; **deepening** P8 (onboarding acceptance, messaging, versioned seller informativa) waits on T05 → T06 / T25 / T30. Do not treat P8 `live` as authorisation to collect visura or seller docs early.

---

## Sign-off

| Field | Value |
|-------|-------|
| Counsel / DPO name | **AZM product-owner authorisation** (2026-08-13) — `docs/audits/EC-S-g1-signoff-enablement.md` |
| Date | 2026-08-13 |
| Memo approved for implementation planning | ☑ yes |
| Layer 1 may ship in T06 | ☑ yes |
| Policy version to stamp | `v1.1` |

*Not legal advice. §6.5 / T25 message controllership and Bunny DPA remain open — do not treat those gates as cleared.*
