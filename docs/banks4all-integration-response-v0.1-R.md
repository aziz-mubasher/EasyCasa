# Banks4All → EasyCasa — Response to Partner Integration Specification v0.1

**Version** 0.1-R (response draft — annotated; not yet cleared for sending)
**Date** 27 July 2026
**From** Banks4All — banks4all.eu
**To** EasyCasa — easycasaita.com
**Responds to** *Banks4All ↔ EasyCasa — Partner Integration Specification*, v0.1, 27 July 2026
**Contact** ⚠️ VERIFY — [name] · [email] · *Owner: AZM*

> **Internal note — remove before sending.** Every remaining `⚠️ VERIFY` is an
> unconfirmed commercial, legal, or ops fact. Engineering items from §10 that
> could be resolved against the portal build (`Banks4All_Portals/Banks_4all`,
> 27 Jul 2026) are marked **CLEARED** below with evidence. Do not invent
> remaining answers. Consolidated open list: §10.

> **Annotation legend**
> - `**CLEARED**` — confirmed in portal code; safe to state as fact in the sendable letter.
> - `⚠️ VERIFY` — still requires AZM / legal / ops / commercialista. Do not guess.

---

## 0. Position in one paragraph

We accept all six of your non-negotiables in §11, without qualification on five
of them and with one structural caveat on the sixth (§8, controllership — see
§1). We prefer Option A as you do, with one addition that closes the revocation
gap you flag in §6. We agree there is no fee in either direction, now or later,
and the reason is stronger on our side than you assume — see §9. We are adding
four non-negotiables of our own, all of them about how the verification is
described to end users rather than how it is transmitted. §4 (badge wording) is
the one we cannot move on, and we would rather resolve it before either side
writes code.

---

## 1. A structural question that comes before §8

Your header records EasyCasa as operated by MUNDIDA. Banks4All is likewise a
brand operated by Mundida S.r.l. (P.IVA IT04531990986).

⚠️ VERIFY — **entity structure.** *Owner: AZM / commercialista.*

**Annotation (do not send):** EasyCasa UI footers say “operated by / gestito da
MUNDIDA”; EasyCasa `docs/legal/privacy-policy.md` still has bracketed
`[EasyCasa legal entity]` / `[EASYCASA_PIVA]`. Banks4All privacy/compliance docs
name Mundida S.r.l. as controller. Whether EasyCasa is the same legal person is
**not** answerable from either codebase. If same entity → internal
purpose-separation policy, not Art. 26. If distinct → EasyCasa §8 reading holds.

If EasyCasa is a distinct legal person, your reading in §8 is correct and we
agree with it as written.

We would rather settle this before drafting, because the answer determines
whether we are producing a DPA-adjacent agreement or an internal governance
control, and the two are not interchangeable in front of a supervisory
authority.

Everything below is drafted to hold under either answer.

---

## 2. Answers to your §12

### 2.1 What does the QR currently encode — the tracking URL, or a payload?

**CLEARED — it encodes the tracking URL.**

Evidence: `backend/src/utils/pipTracking.js` (`buildPipTrackUrl`,
`buildPipStickerSvg`); frontend `PipFinalScreen.js` /
`PipTrackPageContent.js`. QR content is
`{CLIENT_PORTAL_URL}/{locale}/property-plan/track/{trackingToken}`.

We agree with your §2.1 analysis in full and do not intend to defend it as a
transport.

We would go further than you do. An unauthenticated, non-expiring, non-revocable
URL rendering a financing assessment is a problem for us whether or not this
integration proceeds, because it is already shareable by any client who receives
one. **Annotation (internal):** the public track payload today also includes
client name, email and phone (`buildPublicPipTrackPayload`) — remediation should
cover PII exposure, not only the assessment fields. We are raising it internally
as a remediation item independent of this work. Thank you for surfacing it.

### 2.2 What is the intended validity period of a verification?

**Proposed: 90 days from assessment date.** ⚠️ VERIFY — *Owner: AZM (product
sign-off).*

**Annotation (do not send as “current behaviour”):** portal PIP `endDate`
defaults to **start + 6 months** today (`mergeConsultantPip` / `pipFields.js`).
90 days is a **proposed change** for the marketplace attestation, not what the
portal currently uses for the PIP window. Keep the proposal; do not claim it is
live.

Reasoning, so you can push back on it: the inputs behind an affordability
assessment (employment position, existing exposures, credit profile) are stable
enough over a quarter that re-assessment inside 90 days would usually return the
same band, and unstable enough beyond it that a six-month-old figure is
misleading. It also lands inside your suggested 60–120 window.

Two conditions attach:

- Validity is **cancelled on material change**, not merely allowed to lapse. If
  a client's circumstances change and we learn of it, the attestation is revoked
  rather than left to expire. This is why §2.5 matters.
- Validity is not renewed automatically. A client returning at day 91 is
  re-assessed.

### 2.3 Is affordability held internally as a band or a single figure?

**CLEARED — consultant approval is a point figure; we will only emit a band.**

Evidence: `pipRequirements.budgetApproved` is a Number (consultant-approved max
property budget). Client wizard *intent* budget is already stored as €10k bands
(`BUDGET_RANGE_OPTIONS` in `pipWizardUtils.js`). Issuance status treats
`budgetApproved > 0` as the affordability signal (`pipIssuanceStatus.js`).

Our position: **we will only ever emit a band.** The point figure will be rounded
outward to the enclosing band before signing.

This is not a concession to your §12 nice-to-have list, it is a requirement on
our side. A point figure crossing to a marketplace will be read by owners as a
pre-approved purchase ceiling, which it is not, and by seekers as a negotiating
position they have involuntarily disclosed to the counterparty. A band is
narrower in disclosure and less wrong in interpretation.

⚠️ VERIFY — **band width for the attestation.** *Owner: AZM.* Suggested
€50,000 increments (intentional coarsening vs the portal’s €10k intent picker).
Confirm against how listings / assessments distribute before locking.

### 2.4 Can `sub` be partner-scoped, or is the identifier global?

**Yes, partner-scoped, and we would decline to send a global one.**

Proposed derivation: `sub = base64url(HMAC-SHA256(partner_salt, internal_id))`
truncated to 128 bits, with a distinct `partner_salt` per relying party, held
only by us. Stable per partner, uncorrelatable across partners, and reveals
nothing on its own.

**CLEARED (build status):** partner-scoped `sub` is **not implemented** today —
this is new work. Feasible; not live.

**CLEARED — `jti` must not be our client or plan reference.**

- `PIP-YYYY-NNNNN` is **live** and **sequential** (`generatePipPlanRef` in
  `pipWizard.js`); used as `planSummary.planRef` / sticker barcode label.
- `B4A-YYYY-NNNNN` is the separate canonical **client** reference
  (`clientRef` / `partnerCrmUtils`).
- Your example `PIP-2026-00002` matches our live plan-ref format. Either
  identifier handed to a partner as `jti` discloses issuance volume. We will
  issue opaque random attestation identifiers in a namespace separate from both.
  You lose nothing — `partner_ref` is what you bind on.

### 2.5 What is your revocation mechanism today, if any?

**CLEARED — none for PIP / marketplace attestations.**

Evidence: no PIP attestation status/revoke API. Existing `revoke` paths are for
**property-collection share links** only
(`propertyCollectionController` / `revokeShareLink`). PIP validity fields
(`startDate` / `endDate`) exist; there is **no server-side auto-revocation** of a
credential based on them. No PIP issuance webhooks.

Proposed design, which we think resolves the tension you identify in §6 better
than either of the options you list:

**Hybrid — signed credential plus a status-only endpoint.**

- The JWS carries all payload data. You never call us to *read* anything.
- A single additional endpoint, carrying no data:

  ```
  GET /v1/attestations/{jti}/status
  → 200 { "status": "verified" }        # or "revoked" | "expired"
  → 404                                  # unknown, or not yours
  ```

- You check it at render time or on a daily sweep of stored attestations —
  your choice, and cheap either way at your stated volume.
- Webhooks per your §6 in addition, as the fast path.

This keeps Option A's property that we learn nothing about which properties your
users view (the status check is per-attestation, not per-view, if you sweep
daily) while giving you real revocation rather than a short-expiry
approximation. If you would rather not run a sweep, short `exp` with re-mint on
portal visit is our fallback, but we think it is the weaker design.

**One change to your status enum.** We do not want `rejected` to cross the
boundary in any form, including as a bare status with no reason code. If an
assessment does not result in a verification, **no attestation is issued at
all** — there is nothing to fetch and no event to send. A `404` and an absence
are the correct representations. Sending you a rejection tells you a named
person was refused, which is a more sensitive disclosure than the one your §2
is built to avoid. The enum crossing to you should be `verified` | `expired` |
`revoked`.

### 2.6 Is a sandbox available, and on what timeline?

⚠️ VERIFY — **no date to be given until this is placed on the board.** *Owner: AZM.*

**CLEARED (existence):** not available today; no partner attestation sandbox or
deterministic fixtures in the portal. Honest answer stands: not in current phase
scope. We agree with your §7 that it is required before you build, and we are
not going to ask you to develop against production. We will come back with a
timeline once this is scoped, not before. Please treat any date you have heard
informally as not committed.

Your proposed deterministic fixtures (`PIP-TEST-VERIFIED` and siblings) are
sensible and we would adopt them, minus the rejected case per §2.5
**(opaque attestation IDs, not sequential PIP refs — see §2.4).**

### 2.7 Does the 12-hour turnaround hold at volume, and is it contractual or best-effort?

**CLEARED (source of the figure):** portal marketing copy only —
`pipWizard.en.json` / `pipWizard.it.json` (“reviewed within 12 hours” /
“revisione entro 12 ore”). Not a contractual SLA in code.

Our position: **best-effort, and we will not contract it.**

The assessment behind a verification includes human advisory work. We are not
prepared to put a hard SLA on a human judgement, and an integration that
implies same-day certainty to a seeker mid-enquiry sets an expectation we would
periodically break in the cases that matter most — the complex ones, which are
exactly the ones a rushed answer serves worst.

What we can offer instead: a published typical turnaround with an honest
distribution rather than a single number, and a `pending` state that your UI can
render as "in progress" rather than as absence.

⚠️ VERIFY — **actual turnaround distribution from operational data.** *Owner: Operations.*

### 2.8 Is there any fee — now or anticipated — in either direction?

**No, in either direction, now or anticipated.** We agree with your §9 and we
would hold this position even if you withdrew it.

The reason on our side is structural rather than regulatory. Banks4All is paid
solely by its clients. We receive no fees, commissions, referral payments or
rebates from banks, mediators, brokers, insurers, real estate agencies or
marketplaces, and that is a disclosed position in our client-facing
transparency material, not an internal preference. A revenue share with EasyCasa
in either direction would falsify a public statement we have already made.

Correspondingly, we will not pay for referred volume, and we would ask that no
future variant of this integration be proposed on that basis.

---

## 3. Response to your §11

| # | Item | Our response |
|---|---|---|
| 1 | No underlying financial data crosses the boundary | **Accepted.** Also our own requirement — see §4. |
| 2 | No unauthenticated URL as transport | **Accepted.** Raising it as an internal remediation item regardless. |
| 3 | `expires_at` present and honoured | **Accepted.** 90 days proposed (§2.2) — AZM sign-off pending. |
| 4 | Signed or authenticated interface, no HTML scraping | **Accepted.** |
| 5 | Controller arrangement in writing before production | **Accepted in substance**, instrument depends on §1. |
| 6 | No fee tied to a credit outcome | **Accepted, and widened** — no fee of any kind, either direction (§2.8). |
| 7 | Option A over Option B | **Agreed**, with the status endpoint of §2.5. |
| 8 | Partner-scoped `sub` | **Agreed** (§2.4); **new build**, not live. |
| 9 | Webhooks | **Agreed** in principle. **CLEARED:** no PIP/attestation webhooks today (Stripe/WhatsApp only). Effort = new work. ⚠️ VERIFY sequencing / board placement — *AZM*. |
| 10 | `partner_ref` round-trip | **Agreed.** Echoed verbatim, never parsed. |
| 11 | Sandbox with deterministic fixtures | **Agreed in principle, no date** (§2.6). |
| 12 | Affordability as a band | **Agreed, and required by us** (§2.3). |
| 13 | Status list for revocation | **Superseded** by the status endpoint (§2.5). |
| 14 | Localisation fixes | **Accepted** (§7). |

---

## 4. Four non-negotiables from our side

All four concern how the verification is described to an end user. None of them
change the transport design.

### B4A-1 — The badge may not say "verified financing"

This is the one we cannot move on.

Banks4All is not a lender and does not issue credit decisions. Nothing we
produce constitutes an approval, a commitment, an offer, or a guarantee that any
lender will lend. Your §1 badge —

> Financing verified · Banks4All · up to €350,000 · valid to 25 Oct 2026

— will be read by a property owner as "a bank has approved this buyer for
€350,000." It is the reading the layout invites, and we would be the party
answering for it.

Proposed replacement, structure rather than final copy:

> **Affordability assessed** · Banks4All · indicative range €300,000–€350,000 ·
> assessed 27 Jul 2026 · valid to 25 Oct 2026
> *Independent affordability assessment. Not a credit offer, approval or
> commitment by any lender.*

The qualifier is not fine print to be styled away. It travels with the badge in
every surface it appears in, including owner notification emails, and it is not
optional at small sizes.

**Badge strings in IT, EN and ES are supplied by us and may not be re-authored
by EasyCasa.** This is not a trust issue — it is that the wording carries our
regulatory exposure, so the wording has to be ours. We are happy for you to
control layout, placement and typography entirely.

⚠️ VERIFY — final IT/EN/ES copy requires legal sign-off before publication.
*Owner: Legal.*

### B4A-2 — Absence of a badge may not be rendered as a negative

Your §7 says an unverified enquiry renders as "not verified." We would ask for
absence instead: badge present, or nothing.

A visible negative marker on every enquiry from someone who has not bought a
Banks4All product turns the marketplace into a two-tier system and converts our
paid service into the price of being taken seriously by an owner. That is bad
for your seekers, bad for the neutrality of your marketplace, and for us it
looks like using an owner's suspicion as a sales channel. We would rather earn
the badge's value from what it says than from what its absence implies.

### B4A-3 — No implication of a lender, a rate, or a product

Nowhere in EasyCasa surfaces, advertising, owner emails or partner material may
the integration state or imply that Banks4All lends, that a rate has been
secured, that a specific lender is involved, or that a mortgage is available on
particular terms.

Credit mediation, where it occurs, is performed exclusively by regulated
operators — our official partner is Credit Prime Mediazione Creditizia S.r.l.
(OAM M540), alongside other mediators on a non-exclusive panel. Banks4All's role
is advisory. The attestation reflects our assessment, not any operator's
decision.

**Annotation (internal — align before send):** some Banks4All compliance drafts
still describe Banks4All / Mundida as performing credit mediation. B4A-3 and
those drafts must be reconciled by Legal so the letter does not contradict
published compliance wording. *Owner: Legal / AZM.*

Your §9 already keeps you clear of the OAM perimeter and we read that as
deliberate. B4A-3 is the presentational half of the same boundary.

### B4A-4 — Brand naming

"Banks4All" in all user-facing surfaces. "Mundida S.r.l." appears only in legal
and fiscal document bodies and in footers carrying registered office details —
never in a badge, an email, a marketplace page or marketing copy. This holds
irrespective of the §1 entity answer.

---

## 5. Deep link (your §5)

Agreed in shape.

**CLEARED:** `partner`, `partner_ref` and `return_url` are **not implemented**
on the portal today. There is no `/property-plan/start` route (hub is
`/property-plan` + step slugs + `/property-plan/track/[token]`). This is portal
work on our side, not a blocker on yours, but you should not build against those
parameter names as though they were live until we confirm.

We accept the constraints as stated: `partner_ref` opaque, single-use, no
personal data, 24-hour expiry on your side, echoed verbatim by us and never
parsed.

⚠️ VERIFY — build placement and sequencing on the board. *Owner: AZM.*

---

## 6. Data protection (your §8)

Subject to §1, we agree with your analysis and with the minimisation position in
your §2. Specifically:

- **Consent symmetry.** Your dedicated consent purpose is right, and it needs a
  counterpart: our client separately authorises Banks4All to disclose a
  verification status to a named marketplace. Two consents, one on each side,
  each independently withdrawable. Withdrawal on our side triggers revocation
  and therefore a webhook to you.
- **What we send** is exactly the fields in §3.1 of your spec, less `rejected`
  (§2.5). We will not add fields without agreement, and we will not send a
  field simply because a future schema version makes room for it.
- **Retention.** Your "statutory retention window" needs naming — please state
  the period and the provision it derives from, so that our two schedules can be
  reconciled rather than assumed compatible. Our own retention on the
  attestation record is ⚠️ VERIFY (*Owner: Legal*), and our AML/KYC data is
  subject to a 10-year statutory hold that is not affected by anything in this
  integration.
- **Extra-EEA processing.** ⚠️ VERIFY (*Owner: Legal*). We intend the
  attestation pipeline to be EEA-only. Our wider platform includes processors
  whose transfer basis is currently under review as part of an ongoing
  compliance workstream, and we will confirm the position for the components in
  scope here rather than give you a blanket assurance we cannot yet evidence.
- **Special category data.** Agreed — none involved, none transmitted.

---

## 7. Localisation (your §10)

Accepted, with thanks, and we would like to be more specific than your fix list.

⚠️ VERIFY — whether "Piano Rosso" is / was a product tier name. *Owner: AZM.*

**Annotation (engineering):** strings `Pianoforte Rosso`, `Link alla Copia`, and
`Le informazioni paga` were **not found** in the current portal message trees
(`frontend/src/messages`, Jul 2026). They may already have been fixed, or lived
on another surface / older deploy. Treat the EasyCasa report as a process defect
signal (full IT/EN/ES string audit) rather than as three confirmed live bugs
until re-checked on production.

If "Piano Rosso" *is* a product tier name, the correct fix is not
`Pianoforte Rosso → Piano Rosso` but exclusion from translation entirely:
product and brand names are protected tokens and should never enter a
translation pipeline in any language.

On your two proposed resolutions — we are doing both, not choosing. We will fix
the strings, *and* the integration should be API-only with EasyCasa rendering
all badge text, per B4A-1. The two are complementary: you control the surface,
we control the wording that appears on it.

---

## 8. What we need from you

1. The §1 entity answer.
2. Your webhook endpoint and rotation contact.
3. Your dedicated-purpose consent text, for review against B4A-1 and B4A-3.
4. Your retention period, named, with its legal basis.
5. Confirmation that badge strings will be taken as supplied (B4A-1).
6. Confirmation on B4A-2 — absence rather than a negative marker.
7. Your preferred band width, if €50,000 is wrong for how your listings
   distribute.

---

## 9. Next step

We suggest a working session on §1, B4A-1 and B4A-2 before either side commits
engineering time. Those three are agreement questions and none of them get
easier after code exists. Transport (§2.4, §2.5, §5) is settled enough in this
document to build from once they are resolved.

---

## 10. Open items before sending (internal — remove before sending)

### Cleared by engineering (no longer block send on these facts)

| § | Item | Cleared fact |
|---|---|---|
| 2.1 | QR payload | Tracking URL only |
| 2.3 | Internal affordability shape | Point figure (`budgetApproved`); emit band |
| 2.4 | `PIP-` / `B4A-` | Both live; sequential; do not use as `jti` |
| 2.4 | Partner-scoped `sub` | Not built; agreed as design |
| 2.5 | Revocation today | None for PIP/attestations |
| 2.6 | Sandbox exists? | No |
| 2.7 | Source of 12-hour figure | Portal marketing copy only |
| 5 | Deep-link params | Not implemented; no `/start` route |
| 3 / §11.9 | Webhook build | No PIP webhooks today; new work |

### Still open — human owners

| § | Item | Owner |
|---|---|---|
| header | Response contact name and email | AZM |
| 1 | Is EasyCasa the same legal person as Banks4All (Mundida S.r.l.)? | AZM / commercialista |
| 2.2 | 90-day validity — sign-off (vs current 6-month PIP window) | AZM |
| 2.3 | Attestation band width (€50k vs other) | AZM |
| 2.6 | Sandbox — board placement before any date is given | AZM |
| 2.7 | Actual turnaround distribution | Operations |
| 3 / §11.9 | Webhook sequencing / board placement | AZM |
| 4 | B4A-1 badge copy IT/EN/ES — legal sign-off | Legal |
| 4 / B4A-3 | Reconcile advisory wording vs mediation language in compliance drafts | Legal / AZM |
| 5 | Deep link parameters — board placement | AZM |
| 6 | Attestation record retention period | Legal |
| 6 | Extra-EEA transfer basis for in-scope components | Legal |
| 7 | Is "Piano Rosso" a product tier name? Re-check production for MT strings | AZM |

---

*Annotated draft for AZM clearance. Field names, periods and thresholds that remain
⚠️ VERIFY stay open; §4's four items are the parts we would need to hold.
Remove all Annotation / CLEARED / §10 tables before sending the external letter.*
