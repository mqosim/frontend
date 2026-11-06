# Production web serving (MFIN frontend)

This directory holds everything the production `web` container needs. The
service itself is defined in the backend repository's
`docker-compose-prod.yaml` (service `web`), which builds this repository as
its build context:

```
ai/
├── backend/    # docker-compose-prod.yaml defines db, migrate, pgbouncer,
│                  # redis, backend and web
└── frontend/      # this repo: build context for `web`
```

Both repositories must be checked out as siblings on the deploy host; the
compose file references `../frontend` directly.

## What the image contains

- Multi-stage `Dockerfile`: Bun builds the Vite SPA, the runtime stage is
  `nginx:1.29-alpine` serving `dist/` only — no sources, dev dependencies or
  secrets.
- `deploy/nginx/default.conf`: SPA routing, `/api/` reverse proxy to
  `backend:3000`, caching and gzip.
- `deploy/nginx/security-headers.conf`: shared header snippet (see the file
  for what is deliberately omitted).
- No `VITE_API_BASE_URL` is set at build time: the built client issues
  same-origin `/api/v1/...` requests that Nginx proxies to the backend.

## TLS / HTTPS topology

TLS is terminated by Caddy, the stack's only public entry point (service `caddy`
in the backend repository's `docker-compose-prod.yaml`, configured by
`caddy/Caddyfile`). Caddy obtains and renews certificates automatically via
ACME (Let's Encrypt / ZeroSSL); all state persists in the `caddy_data` /
`caddy_config` named volumes, so renewals survive restarts. No certbot, no
manual certificate provisioning, no renewal hooks.

HTTPS is **required**, not optional: the backend issues the refresh cookie with
`Secure; SameSite=Strict`, and browsers refuse to store `Secure` cookies
delivered over plain HTTP — login would not survive a page reload without TLS.
Caddy's automatic HTTP→HTTPS redirect (on the ports it publishes) covers this.

Request flow:

```
Internet -> Caddy (:80/:443, the only published ports)
         -> web:80  (Nginx: SPA + /api/ proxy)
         -> backend:3000 -> db / pgbouncer / redis / internal services
```

Only the `caddy` service publishes host ports (`${CADDY_BIND_ADDR}` on `80`,
`443` tcp and `443` udp). The `web` and `backend` services have no published
ports and are unreachable from the internet; PostgreSQL, PgBouncer and Redis
were already unpublished.

Forwarded headers:

- Caddy sets `X-Forwarded-For` / `X-Forwarded-Proto` when proxying to `web:80`.
  The `map $http_x_forwarded_proto` block in `default.conf` honors Caddy's
  forwarded scheme; nothing else changes in this repository.
- The backend trusts `TRUSTED_PROXY_CIDRS` when extracting the client IP from
  `X-Forwarded-For` (rate limiting, lockouts, audit logs). Set it to the Compose
  network subnet, pinned to `172.28.0.0/16` in `docker-compose-prod.yaml` — the
  two values must match; see the backend `.env.prod.example`.
- `CORS_ALLOWED_ORIGINS=https://mfin.uz,https://www.mfin.uz` (never a wildcard).

### Deployment prerequisites (operator)

- DNS: `A`/`AAAA` records for **both** `mfin.uz` and `www.mfin.uz` pointing at
  the VPS IP **before the first Caddy start** — ACME issuance fails otherwise.
- Firewall: allow TCP `80` and `443`; UDP `443` is optional (HTTP/3 — TCP
  fallback works without it).
- No manual certificate provisioning and no renewal hooks; issuance and renewal
  are automatic.
- Optional: set an ACME contact `email` in `caddy/Caddyfile` for expiry notices.

Do not issue certificates or change DNS as part of the application deploy;
that stays a documented manual step for the operator.

## Security headers — known limitations

- No `Content-Security-Policy`: the vendored E-IMZO integration
  (`public/e-imzo/`) loads classic scripts from `/e-imzo/` and connects the
  browser directly to the local desktop app over `wss://127.0.0.1:64443`
  (HTTPS) / `ws://127.0.0.1:64646` (HTTP). A CSP must explicitly allow
  `connect-src` to those loopback WebSocket endpoints before it can ship.
  Audit with the real signing flow first.
- No `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`: same
  E-IMZO risk profile, no demonstrated need.
- `X-Frame-Options: SAMEORIGIN`, `nosniff`, `Referrer-Policy` and a
  conservative `Permissions-Policy` are active.
- `Strict-Transport-Security` is set at the Caddy layer (`max-age=31536000`;
  `includeSubDomains` omitted until every `*.mfin.uz` subdomain is HTTPS-only).
  The line in `security-headers.conf` stays commented out on purpose — HSTS is
  not doubled up at the Nginx layer.
