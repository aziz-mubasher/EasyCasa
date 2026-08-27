# Legenda lab host (easycasaita.com → venture subdomain)

**Lab:** `https://legenda.easycasaita.com/it/aste/lab`  
**Repo:** `aziz-mubasher/legenda` on the VPS at `/opt/legenda`  
**Edge:** Traefik `Host(legenda.easycasaita.com)` — not Caddy.

## Cookie

`ec_access` is set with `Domain=.easycasaita.com` so the lab host can read the session. Localhost stays host-only.

Sign-in from the lab hits `https://easycasaita.com/{locale}?legenda_return=https://legenda.easycasaita.com/...` and `LegendaReturnBoot` starts OIDC, then returns.

## 301 from the apex lab

Set `NEXT_PUBLIC_LEGENDA_LAB_ORIGIN=https://legenda.easycasaita.com` and rebuild web **or** apply `infra/docker-compose.legenda-redirect.yml`. Do this only after DNS + `/opt/legenda` respond 200.


## LIVE (2026-08-27)

DNS A `legenda` → `82.25.97.164`. Traefik TLS issued. Apex `/{it,en,es}/aste/lab` 301s via `infra/docker-compose.legenda-redirect.yml`. `infra/deploy.sh` includes that overlay when the file exists.
