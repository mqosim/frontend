# syntax=docker/dockerfile:1

# --- app build stage -------------------------------------------------------
# Pinned to the Bun version the lockfile was generated with. Install and build
# run inside the image so the host toolchain never leaks into the artifact.
FROM oven/bun:1.4.3-alpine AS build

WORKDIR /src

# vue-tsc is a Node-shebang script, so under this Bun-only image it would run
# on Bun's JavaScriptCore runtime, where the TypeScript compiler is an order
# of magnitude slower and holds ~1.5x the memory (oven-sh/bun #39424, #4036) —
# measured at 40+ minutes on a 2-core VPS. Install a real Node runtime and run
# the type check with it explicitly. Build stage only: the final image below
# is nginx-only and never contains Node or Bun.
RUN apk add --no-cache nodejs

# Dependencies in their own layer so source edits do not re-fetch packages.
# --frozen-lockfile fails the build instead of silently drifting from bun.lock.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# No VITE_* variables are set on purpose: VITE_API_BASE_URL stays empty, so
# the built client issues same-origin /api/v1/... requests that the Nginx
# runtime stage proxies to the backend. Never pass secrets as build args —
# they are baked into image layers and remain visible in `docker history`.
COPY . .
# Type check on Node (see above); vite build stays on Bun, where it is fast.
RUN node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.app.json \
 && bunx vite build

# --- runtime stage ---------------------------------------------------------
# Keep this stage LAST so a plain `docker build .` (no --target) produces the
# deployable image: Nginx + static files only — no Bun, no sources, no
# devDependencies, no secrets.
FROM nginx:1.29-alpine

# Replace the stock welcome config with the SPA + /api/ reverse proxy, and
# ship the shared security-header snippet beside it.
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf

# Static SPA output. Vite copies public/ (e-imzo/, fonts/, theme-init.js,
# favicon, icons) into dist/ during the build, so everything the app serves
# lives in this single directory.
COPY --from=build /src/dist /usr/share/nginx/html

EXPOSE 80

# The image's default CMD (`nginx -g "daemon off;"`) is kept: the master runs
# as root only to bind :80, worker processes run as the unprivileged `nginx`
# user.
