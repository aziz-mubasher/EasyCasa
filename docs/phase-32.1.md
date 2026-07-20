# Phase 32.1 — Cutover readiness (Phase 6 reconciliation)

**Goal:** after Phase 30–32 productionization, confirm the **SEO-safe WordPress cutover** toolkit is still the source of truth, aligned to **this** VPS (`easycasaita.com` + Traefik), and that remaining gates are explicit.

This folder drop is the Phase 6 hardening/cutover scaffold (`cutover.md` + `easycasa-phase6`). Most artifacts were already adapted in Phase 6 — **32.1 does not re-drop Prisma/Caddy-as-primary-edge**. It reconciles hostnames, Traefik-first runbook steps, and go-live gates.

---

## Already in the repo (do not replace blindly)

| Area | Location |
|------|----------|
| Cutover runbook | `docs/cutover.md` (Traefik-first) |
| Phase 6 checklist | `docs/phase-6.md` |
| Security checklist / incident | `docs/security-checklist.md`, `docs/runbooks/incident.md` |
| SEO | `apps/web/app/sitemap.ts`, `robots.ts`, `StructuredData` + `GET /listings/sitemap` |
| Edge (VPS) | `infra/docker-compose.traefik.yml` — HSTS / nosniff / frame / AI rate-limit |
| Edge (optional Caddy) | `infra/caddy/` — `--profile caddy` + redirects import |
| Load / drill | `load/k6/*`, `scripts/backup-restore-drill.sh` |
| Security CI | `.github/workflows/security.yml`, `.gitleaks.toml` |
| a11y / CWV | `.pa11yci.json`, `lighthouserc.json`, `a11y-webvitals.yml` |
| Observability overlay | `infra/observability/` |

---

## What 32.1 changes

- Hostnames in cutover / k6 / Caddyfile → **`easycasaita.com`** (scaffold used `easycasa.it` / staging).
- Cutover T-0 steps describe **Traefik dark-launch + DNS flip**; Caddy redirect import remains an optional path.
- `www` → apex **301** via Traefik middleware (permanent).
- This doc + README pointer.

---

## Still open before flipping WP traffic

Manual / ops gates (not code):

1. Regenerate redirect map from live WP; spot-check top 100 URLs (`pnpm --filter @easycasa/migration redirects`).
2. Pass backup-restore drill + k6 search/soak against production/staging URL.
3. Sign `docs/security-checklist.md` + pentest highs.
4. Bring up observability overlay if you want Grafana/Alertmanager during the window.
5. Rehearse rollback (DNS revert with TTL=300s) on a throwaway hostname if needed.
6. Execute `docs/cutover.md`; retire WP only after 7–14 clean days.

---

## Not adopted from the sandbox

- Replacing Traefik with Caddy as the VPS edge.
- Scaffold `api:3001` / `easycasa.it` hostnames.
- Running pentest / GDPR sign-off / live k6 in this PR — configs only.
