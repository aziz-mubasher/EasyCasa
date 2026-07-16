# Build a Caddy binary with the plugins the Caddyfile needs.
FROM caddy:2.8-builder AS builder
RUN xcaddy build \
    --with github.com/mholt/caddy-ratelimit \
    --with github.com/caddy-dns/cloudflare

FROM caddy:2.8-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
# Caddyfile + generated redirects are bind-mounted or copied at deploy time:
#   infra/caddy/Caddyfile           -> /etc/caddy/Caddyfile
#   migration/out/redirects.caddy   -> /etc/caddy/redirects.caddy
