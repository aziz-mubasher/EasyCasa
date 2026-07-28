# EC-3 — Banks4All integration hardening

Boundary tests and fixes after EC-1 met B4A-1 for the first time.

## Particle / initials rule

Banks4All `buildPublicPipClientInitials` takes `charAt(0)` of **separate**
`firstName` / `lastName` fields. The surname initial is therefore the **first
letter of the full surname string** (`De Luca` → `D`), not the last token.

EasyCasa mirrors that when only `displayName` exists: first whitespace token =
given name; **remainder** = surname string.

Known limitation: multi-word given names stored as a single display name
(`Maria José García`) become `M.J.` here, while B4A with
`firstName="Maria José"` + `lastName="García"` emits `M.G.`.

Comparison folds NFD and strips combining marks before equality.

## Fail-soft

`HttpBanks4AllAdapter.verify` never throws. Connection refused, DNS failure,
5xx, 401, malformed JSON, missing `expires_at`, and >3s latency all leave the
enquiry creatable with null B4A columns.

## Calendar

Badge visibility uses `Europe/Rome` calendar dates, not UTC `toISOString()`.

## API surfaces

- Seeker create/list: no `b4aToken` / band / expiry on the wire (warnings only).
- Owner inbound: band + expiry for the badge; **never** the tracking token.
- Owner email: band formatted as euros (`band_max_cents / 100`), Mundida disclaimer intact.
