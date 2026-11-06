# Frontend

Vue 3 + TypeScript + Vite SPA for the Go API, organised as a Clean-Architecture
feature slice. Current scope: **regular auth** (register, password login, logout,
session restore), **SYSTEM auth** (login, logout, session restore), minimal
workspace selection, and the i18n loader.

## Requirements

- [Bun](https://bun.sh) (package manager and script runner)
- The Go backend reachable on `http://127.0.0.1:8080` (the dev proxy target)

## Run

```sh
bun install
cp .env.example .env.local      # optional; defaults work for local dev
bun run dev
```

Open **http://localhost:5173** — **not** `http://127.0.0.1:5173`. The backend
sets its refresh cookies as `Secure; SameSite=Strict`; `localhost` is a browser
secure context, so those cookies are stored over plain HTTP, while `127.0.0.1`
is not a secure context in Safari and the cookies are dropped there.

The dev server proxies `/api` to `http://127.0.0.1:8080` (see `vite.config.ts`),
so the browser sees a single origin and `SameSite=Strict` cookies stay
first-party. The backend's CORS does not allow credentials, so this proxy is the
supported way to develop against it. The proxy adds no rewrite: every generated
API path already includes `/api/v1` itself.

To exercise register / workspace selection locally, start the backend with
`EIMZO_ALLOW_MOCK=true` and set, in `.env.local`:

```sh
VITE_EIMZO_MOCK=true
VITE_EIMZO_MOCK_PKCS7=test_mock      # test_mock -> PERSON, test_mock_org -> ORG
```

The E-IMZO mock loads **only** in a dev build with `VITE_EIMZO_MOCK=true`; it is
stripped from production bundles.

## Scripts

| Script                 | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `bun run dev`          | Vite dev server (port 5173, `/api` proxy)                    |
| `bun run build`        | `vue-tsc --noEmit` + production build to `dist/`             |
| `bun run preview`      | Serve the production build                                   |
| `bun run typecheck`    | `vue-tsc --noEmit`                                           |
| `bun run lint`         | ESLint, including architecture (boundary) rules              |
| `bun run format`       | Prettier write                                               |
| `bun run format:check` | Prettier check                                               |
| `bun run api:generate` | Regenerate typed client from `openapi/openapi.json`          |
| `bun run api:refresh`  | Refresh `openapi/openapi.json` from the backend or a dev URL |

## Environment variables

All variables are optional for local development; see `.env.example`. Never
commit real values.

| Variable                | Default     | Meaning                                                                         |
| ----------------------- | ----------- | ------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`     | _(empty)_   | Optional API **origin** override (e.g. `https://api.example.com`, no `/api/v1`) |
| `VITE_EIMZO_MOCK`       | `false`     | Dev-only E-IMZO mock switch (must be exactly `"true"`)                          |
| `VITE_EIMZO_MOCK_PKCS7` | `test_mock` | pkcs7 the mock impersonates (`test_mock*`)                                      |

## Architecture

Feature slices with four layers plus a shared kernel; dependencies point inward
only and are enforced by `eslint-plugin-boundaries` (a violating import fails
`bun run lint`).

```
src/
  app/            composition root: main.ts, router, DI container, layouts
  shared/         domain (AppError, Result) | infrastructure (http, tokens)
                  | presentation (base components, styles, composables)
  features/
    auth/         regular: register, login, logout, refresh, workspace
    system-auth/  SYSTEM: login, logout, refresh
    i18n/         translation loader, language switcher
      domain/         entities, ports, errors — no Vue, no fetch
      application/    use cases — pure TS
      infrastructure/ repository implementations, DTO -> domain mappers
      presentation/   views, components, composables, Pinia stores, routes
```

Rules: `domain` is pure; `application` depends only on `domain`;
`infrastructure` may use the generated client but never Vue/presentation;
`presentation` reaches application through injected use cases. Features
communicate only through their public `index.ts`. Generated API types never
leak past `infrastructure`. Ports are bound to implementations only in
`app/di/container.ts`.

The two auth contexts are fully independent: separate stores, routes, in-memory
token stores, clients and refresh logic. A SYSTEM session never calls
`/auth/refresh`, and vice versa.

## Translations

UI copy comes from `GET /api/v1/public/translations?pages=…&lang=…`, requested
per route (the `common` page plus the route's `translationPages`). English
strings are embedded as a fallback so the UI works before phrases are seeded;
`docs/phrases-to-seed.json` contains the seed data for every key the UI uses.

`docs/` holds the frontend's seed inputs for the backend's `internal/seed/data/`
files. `docs/pages-to-seed.json` carries the same page slugs the backend seeds
(`slug`, `description`, `is_active`), and `docs/phrases-to-seed.json` carries the
UI phrases in the backend's phrase shape (page slug → word → language →
translation, using the `uz`/`ru`/`en` locale codes). A phrase can only be seeded
once its page slug exists in `pages.json`, because the phrase seeder resolves the
page by slug and aborts when it is missing. Nine of the pages are the UI's
(`common`, `home`, `auth.login`, `auth.register`, `auth.workspace`, `dashboard`,
`org`, `system.login`, `errors`); `settings.profile` and `notifications` are
backend-owned (the latter holds the welcome-email templates), so the backend's
`phrases.json` additionally keeps those two phrase groups beyond the UI phrases
listed here.
