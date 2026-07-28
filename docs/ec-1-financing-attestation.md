# EC-1 — Financing attestation on enquiries

**Depends on** Banks4All B4A-1 (`GET /v1/attestations/:trackingToken`) on staging  
**Migration** `0032_enquiry_banks4all_attestation.sql`

Seeker pastes a Banks4All tracking URL/token into the enquiry form. API verifies
server-side (fail soft), caches four columns on the enquiry, shows an owner badge.
Nightly sweep re-checks and clears on 404/401. No webhooks. No deep link.

See partner framing in [`banks4all-integration.md`](./banks4all-integration.md).
