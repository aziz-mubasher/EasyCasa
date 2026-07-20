# Cutover Runbook — WordPress → EasyCasa (SEO-safe, reversible)

**Live hostname today:** `easycasaita.com` (+ `www`) on Traefik / Hostinger VPS `82.25.97.164`.  
**Goal:** move public traffic from WordPress to this stack without dropping rankings, with rollback at every step.

> **Edge (this VPS):** production hits **Traefik** (`infra/docker-compose.traefik.yml`) — security headers + `/ai` rate limit.  
> **Caddy** under `infra/caddy/` is for local/`--profile caddy` or a future dedicated edge that imports `redirects.caddy`.  
> **Redirects:** `pnpm --filter @easycasa/migration redirects` → `migration/out/redirects.caddy` + `.csv`. On Traefik, apply the CSV via Cloudflare Page Rules / Workers, Next middleware, or temporarily front the origin with the Caddy build for the 301 map. Keep WP frozen until 7–14 clean days.

**Roles:** Cutover lead ____ · DB/infra ____ · SEO ____ · Comms ____  
**Window:** low-traffic (e.g. Tue 02:00–05:00 CET). **Freeze:** no unrelated deploys 24h before.

Legend: 🟢 reversible instantly · 🟡 reversible in minutes · 🔴 point of no easy return.

---

## T-7 days — Prepare

- [ ] Final content freeze on WordPress announced (editors stop publishing at T-24h).
- [ ] Fresh production data migration rehearsed end-to-end (`etl → geocode → media → reconcile`); reconciliation report signed off.
- [ ] **Redirect map regenerated** from current WP permalinks:
      `pnpm --filter @easycasa/migration redirects` → `migration/out/redirects.caddy` + `.csv`.
- [ ] Redirect map spot-checked: top 100 URLs by traffic (GSC/analytics) each map to a live new URL. **#1 ranking risk — do not skip.**
- [ ] If using Caddy edge: `caddy validate` against the plugin build (rate_limit + redirects imported).
- [ ] Security checklist (`docs/security-checklist.md`) signed off; pentest criticals/highs fixed.
- [ ] Load test green: `BASE_URL=https://easycasaita.com k6 run load/k6/search.js`  
      Soak green: `BASE_URL=https://easycasaita.com k6 run load/k6/soak.js`.
- [ ] **Backup-restore drill passes** (`scripts/backup-restore-drill.sh`).
- [ ] Observability (optional but recommended): Prometheus targets up, Grafana overview, Alertmanager routes tested (`infra/observability/`).
- [ ] Rollback rehearsed. Everyone has read this doc + `docs/phase-32.1.md`.
- [ ] Google Search Console: sitemaps prepared; property verified for `easycasaita.com` / `www`.

## T-24h — Lower TTL & final sync

- [ ] 🟢 Lower DNS TTL for `easycasaita.com` / `www` A/AAAA (and CNAMEs) to **300s**. Do this a full day ahead so low TTL has propagated *before* the switch.
- [ ] Confirm WordPress is read-only / frozen. Take a final WP DB + uploads snapshot (rollback source of truth).
- [ ] Run the final ETL delta into production Postgres; re-run `reconcile`; review.
- [ ] Deploy the release to **production infra** but keep the **WordPress hostname** DNS on WP (dark launch on `easycasaita.com` is already live — smoke via `/etc/hosts` or origin IP for any new hostname you are flipping).

## T-0 — Switch

1. [ ] 🟢 Put WordPress in a lightweight maintenance/redirect mode as a safety net (optional): 302 → new host for anything the map misses. Keep WP reachable.
2. [ ] Install the redirect map at the edge (Cloudflare / Caddy import / Next middleware). Verify a few **301**s with `curl -I`.
3. [ ] 🔴 **Flip DNS** A/AAAA (or CF proxied records) for the WordPress public hostname(s) to the EasyCasa origin (`82.25.97.164`). Confirm `www` → apex **301** (Traefik middleware).
4. [ ] Watch propagation: `dig +short easycasaita.com @1.1.1.1` / `@8.8.8.8` (and the former WP hostname). TTL=300s → most resolvers flip within ~5–10 min.

## T+0 → T+60m — Verify

- [ ] Homepage, search, a listing detail, add-home, login all load over HTTPS with valid cert.
- [ ] `curl -sI https://www.easycasaita.com/` → **301** → `https://easycasaita.com/`.
- [ ] 10 sampled old WP URLs → `curl -sI` returns **301** to the correct new URL (not 302, not 404).
- [ ] `https://easycasaita.com/robots.txt` and `/sitemap.xml` resolve; sitemap lists listings.
- [ ] Security headers present (`curl -I`); HSTS visible.
- [ ] Rate limiting: hammer `/ai/*` → 429 without breaking normal browse. Stripe webhook test → 200 if billing live.
- [ ] Grafana (if up): request rate flowing, 5xx ≈ 0, search p95 < 800ms.
- [ ] Submit sitemaps in GSC; URL Inspection on 3–5 key pages → request indexing.

## T+1 → T+14 days — Stabilise

- [ ] Raise DNS TTL back to 3600s once stable (T+24–48h).
- [ ] GSC daily: Coverage (404 spikes = redirect gaps → patch map and redeploy), Crawl stats, CWV.
- [ ] Compare organic traffic vs baseline; investigate sustained >15% drop against the redirect map.
- [ ] 🔴 **Retire WordPress** only after 7–14 clean days: keep the frozen WP snapshot archived offsite ≥90 days.

---

## Rollback

Pick the lightest step that resolves the problem.

- **Redirect gaps / individual 404s (most common):** do **not** roll back. Fix the map, regenerate, redeploy edge rules. Minutes, no DNS change.
- **App broken but DNS already flipped, WP still intact:** 🟡 revert DNS A/AAAA to the WordPress origin. TTL=300s → recovery in ~5–10 min. Announce, then debug EasyCasa out of the traffic path.
- **Data problem post-cutover (writes on new DB):** stop writes, restore from the pre-cutover verified dump (`scripts/backup-restore-drill.sh` proves this), repair, re-verify. Only revert DNS to WP if recovery will exceed the acceptable outage.

**Rollback triggers (any one):** checkout/payments failing, auth broken for all users, sustained 5xx >5% for >10 min with no quick fix, or data integrity in doubt.

**Comms:** post status at switch, at verified-green, and at any rollback.
