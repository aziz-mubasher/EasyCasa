# Phase 12 — Rentals Compliance: RLI Registration, Cedolare Secca & AML/KYC

**Goal:** the rental path end-to-end — a type-aware lease, the **cedolare secca** option, **RLI registration** with the Agenzia delle Entrate (the 30-day clock and the registro/bollo taxes), and **AML/KYC** (D.Lgs 231/2007). This is the highest-automation, highest-compliance surface: as an authorised agent EasyCasa is *obliged* to register leases telematically.

Design reference: `easycasa-system-design.md` §5.4 (AML) and §5.5 (rental registration).

> **Professional-only principle:** any rental step that requires a regulated professional (e.g. an APE for the lease) routes through the Phase 11 credential gate — mediation → verified REA + valid RC insurance, conformity → albo tecnico, APE → certified assessor — and cannot be downgraded.

---

## Verified against current (2026) Italian rules

| Rule | Value encoded |
| --- | --- |
| Cedolare secca — canone libero | **21%** |
| Cedolare secca — canone concordato / studenti | **10%** |
| Cedolare secca — transitorio | 10% only as *agevolato* in a high-tension municipality, else 21% |
| Cedolare effect | Waives IRPEF, addizionali, **imposta di registro and bollo**; forfeits ISTAT rent adjustment |
| Imposta di registro (ordinary) | **2%** of annual rent, **min €67** (first annuity) |
| Concordato in high-tension | Registro base reduced to **70%** of rent |
| Imposta di bollo | **€16** per 4 written sides, per copy (default €32) |
| Registration deadline | **30 days** from the earlier of signing or start |
| Lease durations | 4+4 (48m), 3+2 (36m), transitorio (1–18m), studenti (6–36m) |

---

## Layout in this repo

```
migration/sql/0011_phase12.sql          # leases + kyc_cases (Drizzle enums lowercase)
apps/api/src/rentals/
  domain/                               # lease, registration, aml (+ vitest)
  rentals.service.ts / controller.ts
  drizzle-lease.repository.ts
  rli-channel.ts                        # Entratel/RLI-web seam
apps/api/src/aml/
  aml.service.ts / controller.ts
  drizzle-kyc.repository.ts
  screening.provider.ts
packages/api-client/src/phase12.ts
apps/mobile/app/(owner)/[propertyId]/lease.tsx
```

---

## API surface

```
POST /leases/preview                 → validate a lease (live, no persistence)
POST /properties/:id/leases          → create (refuses invalid)
GET  /leases/:id
GET  /leases/:id/rli-payload         → RLI payload: rate, deadline, registro+bollo
POST /leases/:id/register            → submit via RLI channel → protocollo
GET  /admin/leases/deadlines         → approaching / overdue (admin)

POST /aml/cases                      → open KYC (screening + factors → risk)
GET  /aml/cases/:id
POST /aml/cases/:id/events           → VERIFY | ESCALATE | CLEAR | REOPEN
```

KYC lifecycle: `OPEN → VERIFIED → CLEARED`, with `ESCALATED` for a sanctions hit — a case that **must escalate cannot be verified directly**.

AML opens automatically when a mandate is signed (`MandateService.onSignatureCompleted`). Registration is blocked while any relevant subject has an unresolved `ESCALATED` case.

---

## Env

See `docs/env.md` Phase 12: `RLI_CHANNEL_*`, `AML_SCREENING_*`. Empty + `DEV_AUTH=true` stubs the seams for local flows; production must configure real providers.

---

## Honest caveats

- **RLI is not an open REST API.** `rli-channel.ts` is the integration seam — confirm the channel and registering party with a commercialista.
- **AML screening** fails safe when unconfigured outside DEV.
- **Tax scope:** first-annuity registro (min €67) and single-payment framing. Multi-year instalments / ravvedimento are follow-ups.
- **Not legal/tax advice.** Validate rates with a commercialista before go-live.
- **Short-term rentals (≤30 days)** are out of scope.
