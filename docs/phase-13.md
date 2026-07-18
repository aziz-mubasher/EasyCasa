# Phase 13 — Admin Back-Office Console

**Goal:** turn the Phases 8–12 engines into an operable tool. A dedicated **React (Vite) web console** for the ops team, covering orchestration, credential verification, compliance config, AML review, and RLI monitoring. It consumes the API through `EasyCasaAdminApi`.

> Deployed at `https://admin.easycasaita.com` (Traefik Host rule). Until OIDC is wired, the image builds with `VITE_DEV_AUTH=true` so the SPA sends `x-dev-*` admin headers (matches API `DEV_AUTH`).

---

## Surfaces

| Page | Wraps | Ops actions |
| --- | --- | --- |
| **Orchestration** | Phase 11 | Open assignments, candidates, assign, approve |
| **Credentials** | Phase 11 | Verify/reject REA, insurance, albo, APE… |
| **Compliance** | Phase 10 + 11 | Legal basis + required credential per catalog item |
| **AML / KYC** | Phase 12 | Review cases; UI mirrors escalation guard |
| **RLI monitor** | Phase 12 | Registration deadlines + urgency |

---

## Layout

```
packages/api-client/src/admin.ts     # EasyCasaAdminApi
apps/admin/                          # Vite React SPA
  Dockerfile + nginx.conf            # static serve
infra/docker-compose*.yml            # admin service + Traefik Host
```

## Admin API additions

```
GET  /assignments?status=open
GET  /aml/cases
GET  /leases
GET  /admin/catalog
PUT  /admin/catalog/:code/legal-basis
PUT  /admin/catalog/:code/credential
```

(`PATCH /admin/catalog/:code/legal-basis` remains for the existing Next admin page.)

## Local

```bash
pnpm --filter @easycasa/admin dev
# VITE_API_BASE_URL=http://localhost:4000 VITE_DEV_AUTH=true
```

## Caveats

- OIDC login for the console is still a follow-up; gate with admin role when wired.
- Real Entratel / AML screening remain Phase 12 seams.
