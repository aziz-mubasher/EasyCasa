# EC-4 — Complete the viewing process

**Date:** 2026-07-28  
**Branch:** `feat/ec-4-viewing-process`  
**Reference:** `easycasa-wireframe-v2.html` screens 05a–05d

## Step 0 pre-flight

```
migrations: …0031, 0032 → next 0033
startOfUtcDay/utcWeekday: apps/api/src/viewings/domain/{intervals,slots,booking}.ts
web viewing routes: none before EC-4
ics: none in package.json — implemented as pure `viewings/ics.ts`
outbox: email OutboxEmailProvider (Phase 37)
```

## What shipped

| Part | Change |
|------|--------|
| **1 Timezone** | `listings.timezone` default `Europe/Rome`; windows are local wall-clock; `zoned-time.ts` + DST tests |
| **2 Web UI** | `/listings/[slug]/book`, `/viewings`, `/viewings/conducting`; CTA **Richiedi visita** |
| **3 Email+ICS** | requested / confirmed / cancelled (+ reminders); `.ics` with stable UID + SEQUENCE |
| **4 Reschedule** | `RESCHEDULE` → REQUESTED; `POST /viewings/:id/reschedule`; bumps SEQUENCE |
| **5 Reminders** | 15m scheduler; 24h email+push, 2h push/email; idempotent via sent_at columns |
| **6 Badge** | Conductor inbox shows EC-1 B4A badge when enquiry attached; absence = nothing |

## Migration note (0033)

Minute values in `viewing_availability` are **not rewritten**. Phase 29 stored
UTC-interpreted minutes that owners meant as Rome wall-clock; EC-4 reinterprets
the same numbers in `listings.timezone`, restoring intent.

## Out of scope (per brief)

05e outcome capture, owner availability UI, payments.
