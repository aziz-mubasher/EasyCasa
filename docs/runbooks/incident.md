# Incident Response Runbook

## Severity

| Sev | Definition | Response | Comms |
|-----|------------|----------|-------|
| SEV1 | Site/checkout/auth down for most users; data loss or breach suspected | Immediate, all-hands | Status page + `#oncall`, updates ≤30min |
| SEV2 | Major feature broken (search, messaging, payments partial) | Within 30 min | `#oncall`, updates hourly |
| SEV3 | Degraded/slow, workaround exists | Next business hours | `#alerts` |

On-call is paged by Alertmanager for `severity=critical`. If you're paged and unsure, treat as SEV2 until triaged.

## First 15 minutes

1. **Acknowledge** the page; declare severity in `#oncall`. Assign an Incident Lead.
2. **Assess blast radius:** Grafana overview (5xx ratio, request rate, latency), Uptime Kuma, recent deploys (`git log`, GHCR tags).
3. **Stop the bleeding** before root-causing:
   - Bad deploy? Roll back: `./deploy.sh --rollback` (redeploys the previous image tag) or `docker compose up -d <service>@<prev-tag>`.
   - Overload/abuse? Tighten Caddy rate-limit zones or enable Cloudflare "Under Attack" mode.
   - One dependency down (Meilisearch/AI/Redis)? Confirm graceful degradation is holding; disable the feature flag if not.
4. **Communicate:** post initial status; set update cadence per severity.

## Diagnose

- Logs: `docker compose logs -f api web ai caddy` (JSON access logs under `/var/log/caddy`).
- Errors: Sentry (grouped by release) — filter to the current deploy.
- DB: `pg_stat_activity` for lock/connection storms; `postgres-exporter` panels.
- External: blackbox probe history; TLS expiry panel.

## Recover & verify

- Apply the fix (rollback, config, scale, or hotfix through CI — don't hand-edit prod).
- Re-run the relevant smoke checks from `docs/cutover.md` (T+0 → T+60m section).
- Confirm alerts resolved in Alertmanager; error ratio back to baseline.

## Data breach path (GDPR — 72h clock)

If personal data may have been exposed:
1. Contain (revoke keys, isolate host, disable affected endpoint).
2. Notify the DPO/lead **immediately** — the 72h notification clock starts at awareness.
3. Preserve evidence (logs, snapshots) before remediation overwrites them.
4. Assess scope: what data, whose, how many, likelihood of harm.
5. If risk to individuals: notify the supervisory authority within **72h**; notify affected users if high risk.
6. Document everything in the incident record (Art. 33/34 evidence).

## After — postmortem (within 5 business days)

Blameless. Cover: timeline, impact, root cause, what detected it (and what should have), action items with owners + dates. File under `docs/postmortems/YYYY-MM-DD-title.md`. Fold prevention items into the backlog.
