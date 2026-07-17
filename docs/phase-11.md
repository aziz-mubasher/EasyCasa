# Phase 11 — Professional Portal + Admin Orchestration

**Goal:** the supply side. When an order includes work that a licensed professional must perform (mediation, conformity/RTI, APE, notary, media), the platform spawns a **task**, routes it only to professionals who clear a **credential gate**, and tracks the deliverable through to admin approval.

> **Repo note:** EasyCasa uses **Drizzle** + `migration/sql/0010_phase11.sql` (not Prisma).

Design reference: `docs/system-design.md` §3.3 (professional portal), §3.4 (admin), §5.3 (agent authorization).

---

## The compliance core: credential-gated assignment

`canAssign()` enforces coverage, capacity, verified non-expired credential, and (for mediation) valid RC insurance. **Admins cannot override** — `assign()` re-checks server-side and returns `409` with blockers.

---

## API surface

```
GET/POST /professionals
POST /professionals/:id/credentials
PUT  /professionals/:id/credentials/status
GET  /assignments
POST /assignments/tasks
GET  /assignments/:id/candidates
POST /assignments/:id/assign | start | deliver | approve
GET  /professionals/:id/assignments
GET/PATCH /admin/credential-policy[/:itemCode]
```

On `POST /properties/:id/orders` (CONFIRMED), tasks auto-spawn for each line whose policy ≠ `NONE`.

---

## UI

- Admin: `/it/admin/assignments`, `/it/admin/professionals`, `/it/admin/credential-policy`
- Mobile: Profile → Professional inbox (`EXPO_PUBLIC_PROFESSIONAL_ID`)

---

## Acceptance

- [x] Domain eligibility + routing + state machine tests
- [x] Nest professionals + assignments (Drizzle, transactional assign)
- [x] api-client `EasyCasaOrchestrationApi`
- [x] Auto-spawn on order confirmation
- [x] Admin boards + credential-policy editor
- [x] Professional portal (inbox / start / deliver via presign)
