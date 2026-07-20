# Phase 6 — Hardening & SEO-safe Cutover (checklist)

**Goal:** go live without breaking rankings — edge security + rate limiting, load &
backup-restore drills, accessibility/Web-Vitals, observability, and a reversible
DNS cutover that retires WordPress.

**This VPS:** Traefik on `easycasaita.com` (see `infra/docker-compose.traefik.yml`).
Caddy Phase 6 build is under `infra/caddy/` for local/`--profile caddy` deploys.

**Phase 32.1** re-checked this toolkit after composition-root reconciliation — see `docs/phase-32.1.md`.

## Steps & acceptance criteria
- [x] **1. Edge security.** Done when: HTTPS with valid cert; security headers on Traefik/Caddy; CSP path documented (report-only → enforce).
- [x] **2. Rate limiting.** Done when: Traefik rate-limit on `/ai/*`; Caddy zones ready for dedicated edge.
- [x] **3. Security scanning.** Done when: `security.yml` + gitleaks config in repo (must run green in CI against live registry).
- [ ] **4. GDPR/pentest.** Done when: `docs/security-checklist.md` signed off; external pentest criticals/highs fixed.
- [x] **5. Load & resilience.** Done when: k6 scripts + backup-restore drill script land in repo (run against staging to gate).
- [x] **6. Accessibility + Web Vitals.** Done when: pa11y/Lighthouse configs point at `easycasaita.com` (run in CI to gate scores).
- [x] **7. SEO.** Done when: `/sitemap.xml` + `/robots.txt` live; listing JSON-LD; redirects generator + cutover runbook.
- [x] **8. Observability.** Done when: Prometheus/Grafana/Alertmanager/Uptime Kuma compose overlay present (bring up when ready).
- [ ] **9. Cutover.** Done when: `docs/cutover.md` rehearsed; DNS flipped; T+60m verification; WP retired after clean window.

## Verified in this scaffold
- Traefik security headers + AI rate-limit + www→apex 301 wired ✅
- `GET /listings/sitemap` + Next `sitemap.ts` / `robots.ts` + StructuredData ✅
- Security CI, k6, pa11y, Lighthouse, backup drill, observability overlay copied ✅

Honest note: k6 thresholds, restore drill, pa11y/Lighthouse, Trivy/CodeQL must run against
**live staging** to gate cutover — configs alone don't prove SLOs.
