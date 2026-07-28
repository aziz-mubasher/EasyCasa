# Banks4All ↔ EasyCasa — Partner Integration Specification

**Version** 0.1 (draft for discussion)
**Date** 27 July 2026
**From** EasyCasa (operated by MUNDIDA) — easycasaita.com
**To** Banks4All — banks4all.eu
**Contact** [name] · [email]

### Repo status (EasyCasa)

| Phase | Status | Code |
|-------|--------|------|
| **A — Referral only** | Live | Outbound links via `apps/web/src/lib/banks4all-referral.ts`; UI in listing afford block, contact section, footer. No PII, no query params, no inbound attestation. |
| **B — Verified enquiry badge (EC-1)** | Implemented (needs B4A-1 staging + partner token) | Migration `0032`; `Banks4AllPort` + `HttpBanks4AllAdapter`; optional tracking field + `b4a_affordability_share` consent on enquiry form; owner badge on mobile inbox + owner email; nightly sweep. Tracking URLs are **not** forwarded to owners. |

Banks4All draft reply (annotated, not cleared for send): [`banks4all-integration-response-v0.1-R.md`](./banks4all-integration-response-v0.1-R.md).

---

## 1. What we want to build

EasyCasa is a commission-free property marketplace in Italy. Buyers and tenants
enquire directly with owners, without an agency filtering the pipeline.

That creates one specific problem: an owner receiving direct enquiries has no way
to tell a serious buyer from a browser. It is the main reason owners drift back
to traditional agencies, and it is the single highest-value thing a financing
verification can fix.

We want to display, on an enquiry, that the sender's financing has been verified
by Banks4All — and nothing more than that. Concretely:

> **Financing verified** · Banks4All · up to €350,000 · valid to 25 Oct 2026

The seeker gets a stronger enquiry. The owner gets a filter. Banks4All gets
qualified inbound at the exact moment someone decides to buy a house. We think
the moment of enquiry is a better acquisition point than almost anywhere else in
the funnel.

## 2. What we are asking you not to send us

This is the part we would like agreed before anything technical.

We do **not** want the underlying financial assessment, and we would prefer it
were not technically possible for us to receive it. Not income, not employer, not
bank or account data, not balances, not a credit score, not debt-to-income
ratios, not documents, not a rendered page containing any of the above.

Two reasons, and the second is the one that matters commercially.

**Legal.** Under GDPR Art. 5(1)(c) we can only process what is necessary for the
purpose. Our purpose is "show an owner that this buyer can fund a purchase in
this range." A status, a band and an expiry satisfy that completely. Anything
beyond it is data we would be holding without a basis, and it would drag the
integration into a heavier review on both sides.

**Commercial.** Your product's value to a seeker is that Banks4All sees their
finances and a marketplace does not. If EasyCasa can see the detail, you have
weakened your own position with the customer, and we have acquired a liability
we did not want. Minimisation is in both our interests here.

### 2.1 The current tracking URL is not a suitable transport

The client portal exposes an unauthenticated tracking page —
`/it/property-plan/track/{uuid}` — described as shareable by anyone holding the
link. That is a reasonable design for parcel tracking. It is not one we can use
for financial verification, for two reasons:

- **We cannot forward it.** If EasyCasa passes that URL to a property owner, we
  have disclosed whatever the page renders, permanently, to anyone the owner
  forwards it to. Access control by unguessable UUID has no revocation, no
  expiry, no audit and no recipient scoping.
- **We cannot scrape it.** Server-side fetching and parsing your HTML is brittle,
  breaks silently on any redesign, and is not a basis we would put in a DPA.

So the ask is a machine interface. Two options follow; we prefer the first.

---

## 3. Option A — Signed credential in the QR *(preferred)*

Encode a compact JWS in the QR instead of (or alongside) a URL. We verify it
offline against your public key. We never call your server, you learn nothing
about which properties our users look at, and there is no page for us to read.

This is the cleanest available design and it resolves §2.1 outright.

### 3.1 Token

Compact JWS, **ES256** (ECDSA P-256). Not RS256 — an RSA signature roughly
triples the payload and pushes the QR past comfortable scanning density.

**Header**
```json
{ "alg": "ES256", "typ": "b4a-att+jwt", "kid": "b4a-2026-07" }
```

**Claims**
```json
{
  "iss": "https://banks4all.eu",
  "jti": "PIP-2026-00002",
  "sub": "pw_7f3a91c4e2b8...",
  "iat": 1785312840,
  "exp": 1793088000,
  "vct": "b4a:financing-attestation:1",
  "status": "verified",
  "product": "property-plan",
  "affordability": {
    "band_min_cents": 25000000,
    "band_max_cents": 35000000,
    "currency": "EUR"
  },
  "partner_ref": "ec_enq_9f3a4b1c"
}
```

| Claim | Notes |
|---|---|
| `sub` | **Partner-scoped pseudonym.** Please derive it per relying party so it cannot be correlated across your partners, and so it carries no identity. We bind to our user via `partner_ref`, not via `sub`. |
| `exp` | Attestation validity, not token lifetime. See §6. |
| `affordability` | A band, not a point figure. If you can only supply a point figure, we will round it into a band before storage and display. |
| `partner_ref` | Opaque value we generate; see §5. Echo it verbatim. |

Estimated payload ~420–580 bytes base64url, which sits comfortably in a
version 15–20 QR at error correction level M.

### 3.2 Key distribution

- JWKS published at `https://banks4all.eu/.well-known/jwks.json`, cacheable,
  `kid` matching the token header.
- Overlapping keys during rotation, minimum 30 days.
- We will pin the issuer and reject any token whose `iss` is not exact.

---

## 4. Option B — Verification endpoint *(if Option A is not feasible)*

```
GET /v1/attestations/{reference}
Authorization: Bearer <token>          # or mTLS, see §7
Accept: application/json
```

**200**
```json
{
  "reference":    "PIP-2026-00002",
  "status":       "verified",
  "product":      "property-plan",
  "issued_at":    "2026-07-27T10:14:00Z",
  "expires_at":   "2026-10-25T00:00:00Z",
  "subject_hash": "sha256:4f2b...",
  "affordability": {
    "band_min_cents": 25000000,
    "band_max_cents": 35000000,
    "currency": "EUR"
  },
  "partner_ref": "ec_enq_9f3a4b1c"
}
```

`status` ∈ `pending` | `verified` | `rejected` | `expired` | `revoked`.

For `rejected` we want the status and nothing else — no reason code. We have no
legitimate use for why someone failed, and we would rather not be able to infer
it. Please return `404` for an unknown reference rather than distinguishing
"never existed" from "not yours."

**Explicitly out of scope for this response body:** income, employment, employer,
bank identity, account or balance data, credit score or rating, DTI or other
ratios, document URLs, free-text assessor notes.

---

## 5. Deep link and binding

A seeker starting from an EasyCasa enquiry should arrive back linked
automatically. Copy-pasting a reference between two systems is where this
integration will lose most of its conversion.

```
https://portal.banks4all.eu/{locale}/property-plan/start
  ?partner=easycasa
  &partner_ref=ec_enq_9f3a4b1c
  &return_url=https%3A%2F%2Feasycasaita.com%2Fenquiry%2Fverified
```

- `partner_ref` is opaque, single-use, contains no personal data, and expires
  after 24 hours on our side.
- Echo it in the attestation (§3.1 / §4) so we can bind without matching on name
  or email — which we would rather not do, since it is both unreliable and an
  unnecessary identity exchange.
- `locale` ∈ `it` | `en` | `es`.

---

## 6. Expiry, revocation, and status changes

A financing verification from eight months ago tells an owner nothing. We will
not render a badge without a validity period.

- **`expires_at` is mandatory.** Tell us your intended validity — we would guess
  60–120 days is right for this product, but it's your call.
- We stop displaying the badge at expiry, without waiting for a webhook.
- **Revocation.** A bare JWS cannot be revoked, so under Option A we need either
  a short `exp` plus an optional status check, or a status list. Short expiry
  alone is acceptable to us if the window is tight.

**Webhook** (both options):

```
POST {easycasa_endpoint}
X-B4A-Signature: t=1785312840,v1=<hex hmac-sha256 of "t.<raw body>">
X-B4A-Event-Id:  evt_01J...
```
```json
{ "event": "attestation.revoked", "reference": "PIP-2026-00002",
  "partner_ref": "ec_enq_9f3a4b1c", "occurred_at": "2026-08-02T09:00:00Z" }
```

Events: `attestation.verified`, `attestation.rejected`, `attestation.expired`,
`attestation.revoked`. At-least-once delivery is fine — we deduplicate on
`X-B4A-Event-Id`. Shared secret for the HMAC, rotatable, 5-minute replay window.

---

## 7. Authentication and operations

| | Request |
|---|---|
| Server-to-server auth | mTLS preferred; OAuth2 client credentials with ≤1h tokens acceptable |
| Sandbox | Required before we build. Deterministic references, e.g. `PIP-TEST-VERIFIED`, `PIP-TEST-PENDING`, `PIP-TEST-EXPIRED`, `PIP-TEST-REVOKED` |
| Rate limits | Please state them. Our expected volume at pilot is low — under 500 verifications/month |
| Availability | Verification is on the enquiry path, so a target and a documented degradation behaviour would help. We fail open: no verification renders as "not verified," never as an error to the user |
| Versioning | Path-versioned (`/v1/`) with a deprecation notice period |

---

## 8. Data protection

We expect to act as **independent controllers**, not joint controllers: Banks4All
controls the financial assessment, EasyCasa controls the marketplace record, and
the exchange between us is a disclosure rather than shared processing. If you
read it as Art. 26 joint controllership we are open to that, but it needs an
arrangement in writing either way, and we would like it in place before
production rather than after.

Our side, for the record:

- **Lawful basis** — explicit consent from the seeker, captured against a
  dedicated purpose in our consent ledger. Sharing financing status with an owner
  is not covered by the consent that governs a normal enquiry, so it is recorded
  separately and can be withdrawn on its own.
- **What we store** — provider, reference, status, `issued_at`, `expires_at`,
  affordability band, `partner_ref`. Nothing else. No token payloads beyond those
  fields, no cached HTML, no documents.
- **What the owner sees** — status, band, expiry date. Never a link, never a
  reference, never a document.
- **Retention** — deleted on enquiry closure plus our statutory retention window;
  earlier on withdrawal of consent.
- **Special category data** — none is involved and none should be transmitted.

Please confirm your transfer basis and whether any processing occurs outside the
EEA.

---

## 9. Commercial

One point to flag early, because it shapes what we can accept.

**EasyCasa cannot take a fee tied to a credit outcome.** Credit intermediation in
Italy sits under a separate OAM register with its own authorisation regime, and
we are not going near it. A revenue share on converted applications — however
structured — is not something we can agree to. Please do not build one into the
proposal.

We are happy for the integration to be free in both directions. The value to us
is enquiry quality; the value to you is qualified volume at the point of
purchase intent. That exchange stands on its own.

---

## 10. Localisation

Your Italian portal copy currently contains machine-translation errors that are
visible to end users. Three from a single screen:

| Current | Should be |
|---|---|
| `Pianoforte Rosso` | `Piano Rosso` — "Piano" has been read as the musical instrument |
| `Le informazioni paga` | `Informazioni di pagamento` |
| `Link alla Copia` | `Copia link` |

We raise it because if we deep-link Italian users into your portal, that becomes
our quality problem in their eyes, not yours. Two acceptable resolutions: you fix
the IT/EN/ES strings, or the integration is API-only and we render all
user-facing text ourselves. We are content with either, and the second is another
argument for §3 or §4 over any embedded or linked view.

---

## 11. What we need to agree

**Non-negotiable**
1. No underlying financial data crosses the boundary (§2)
2. No unauthenticated URL as transport (§2.1)
3. `expires_at` present and honoured (§6)
4. Signed or authenticated interface — no HTML scraping (§3/§4)
5. Controller arrangement in writing before production (§8)
6. No fee to EasyCasa tied to a credit outcome (§9)

**Wanted, negotiable**
7. Option A over Option B
8. Partner-scoped `sub`
9. Webhooks
10. `partner_ref` round-trip
11. Sandbox with deterministic fixtures

**Nice to have**
12. Affordability as a band rather than a point figure
13. Status list for revocation
14. Localisation fixes

## 12. Open questions for Banks4All

1. What does the QR currently encode — the tracking URL, or a payload?
2. What is the intended validity period of a verification?
3. Is affordability held internally as a band or a single figure?
4. Can `sub` be partner-scoped, or is the identifier global?
5. What is your revocation mechanism today, if any?
6. Is a sandbox available, and on what timeline?
7. Does the 12-hour turnaround hold at volume, and is it contractual or best-effort?
8. Is there any fee — now or anticipated — in either direction?

---

*Sent as a draft for discussion. Numbers, field names and thresholds are all
open; §11's non-negotiables are the parts we would need to hold.*
