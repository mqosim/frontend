# Current state

## Repository facts (verified 2026-11-12)

- Branch: `main`. Work stays on `main`; the AGENTS.md `api-migration` branch rule is
  obsolete for this migration (explicit user decision, 2026-11-10). Working tree is
  **clean** at handoff time (before this handoff edits the tracked memory files).
- Recent commits (this session's work first):
  - `3f56a99` — `fix(system-admin,org-dashboard): let sidebar labels wrap instead of
    clipping` (2 files; CSS-only wrap fix).
  - `676d2d9` — `fix(i18n): show native language names and fix the uz_Cyrl flag`
    (7 files; +144/−22, incl. new `tests/i18n/languageDisplay.test.ts`).
  - `ff0b66b` — `feat(system-admin): migrate the control plane to the FastAPI
    contract` (33 files, +1327/−1419; includes the admin identity/permissions
    loading migration from the same session and the two deleted global-user pages).
  - `9e1a709`/`7d42336`/`cba8452` — user-committed memory files.
  - Earlier: `efeaa16` (language fields), `ebe02c4` (TOTP enroll QR), `81f7687`
    (SYSTEM auth 6a–6c).
- Tooling (`package.json`, re-verified): `typecheck` =
  `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.app.json`;
  `build` = typecheck + `vite build`; `lint` = `eslint .`; `format:check`;
  `api:generate` = `openapi-typescript openapi/openapi.json -o src/shared/infrastructure/api/schema.ts`.
  **No `test` script** — tests run with
  `bun --tsconfig-override=tsconfig.app.json test tests/`.
- Test files (18): `tests/auth/{eimzoRepository,languageRepository,profileMappers,registerMappers,registrationErrors}.test.ts`,
  `tests/i18n/{languageDisplay,localeCodes,phrasesSeed}.test.ts`,
  `tests/notifications/{notificationPreferencesRepository,useCases}.test.ts`,
  `tests/shared/{eimzoErrorKeys,httpErrors,jwtDecode}.test.ts`,
  `tests/system-admin/{auditLogRepository,mappers,permissions}.test.ts`,
  `tests/system-auth/{enrollmentQr,systemAuthRepository}.test.ts`.
- Dependencies unchanged since `uqr ^0.1.3` (QR, dynamically imported only).
- **`node` is NOT installed on this machine** (only Bun). Vue-tsc was executed as
  `bun node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.app.json` — treat the
  canonical Node command as the user's authoritative re-check.
- Dev environment: `vite.config.ts` proxies `/api` → `http://127.0.0.1:8000` (Python
  backend). Browse `http://localhost:5173` (secure-context cookie requirement).
  Backend start: `cd ../backend && .venv/bin/uvicorn app.main:app --app-dir src --port 8000`
  (`make run` fails here: `uvicorn` is not on the system PATH).
- There is **no Go backend** on this machine (`~/projects` = `backend` (Python),
  `frontend`, `api-client` (Bruno collection, baseUrl `http://localhost:8000`)). The
  Go contract survives only in git history.

## API migration status

- **Both SYSTEM features are fully on the FastAPI contract. Zero `/api/v1/admin`
  references remain** (verified by grep and by a contract sweep: all 16 paths called
  by the two features' repositories exist in `openapi/openapi.json`).
- Done and committed: auth Phase 2+3, i18n loader, registration, E-IMZO +
  notifications-language, SYSTEM auth 6a–6c, TOTP-enroll QR, saved-language fields,
  SYSTEM admin identity/permissions loading, **SYSTEM admin control plane**
  (tenants, tenant members, staff users, permission catalogue, audit).
- system-admin control-plane design (commit `ff0b66b`, decisions D1–D3 approved):
  - Organization members live on the tenant detail page
    (`GET /system/tenants/{id}/users`, offset+`total` in body); the global Users
    directory, its detail page and unsupported member actions were removed.
  - Audit rows expand from the list item (no detail endpoint); audit is
    **cursor-paginated** (`next_cursor` → Load-more); lists are offset-paged with
    `total` in the body (no `X-Total-Count`).
  - Tenant suspend/reactivate require a **reason** (1..200 chars) — collected in the
    confirm dialog (shared `ConfirmDialog` gained an optional reason input).
  - Staff role editing is a singular-role radio group via `PATCH /system/users/{id}`;
    role/status values are contract-checked client-side (derived guards), invalid
    values become a local validation error.
  - Text search is client-side over the loaded page with an explicit scope notice.
  - Permission catalogue = the backend's 9 fixed codes (`system.users.read/write`,
    `tenants.read/manage`, `tenants.users.read`, `i18n.read/manage`, `audit.read/verify`)
    with roles `superadmin`/`operator`/`i18n_editor`.
- Language selector (commit `676d2d9`): full labels use the API's `nativeName`
  (`Language` entity gained the field) with a built-in native fallback table
  (`languageLabels.ts`); flag/label lookups normalize every code form
  (`uz-Cyrl`/`uz_Cyrl`/`uzc` → `uzc`), so the Uzbekistan flag always resolves.
- Sidebar labels (commit `3f56a99`): wrap instead of ellipsis in both sidebars
  (SYSTEM + org); collapsed state untouched.
- Architecture audit (2026-11-12, read-only): system-auth/system-admin separation
  verified clean — `system-admin → system-auth` via public barrels only (3 imports),
  no reverse imports, no cycles; session primitives single-owned in shared infra.
  `useSystemLogout` stays in system-admin (mirrors `useOrgLogout` per-realm convention).

## Runtime verification (live, this session — against the running Python backend)

- Verified 200/204: `POST /system/auth/login`, `POST /system/auth/totp`,
  `GET /system/auth/me` (fresh + refreshed token), `POST /system/auth/refresh`
  (cookie rotation works; token re-issued), `POST /system/auth/logout` (204, family
  revoked), `GET /system/auth/me` with the language PATCH (earlier), `GET
  /system/permissions`, `GET /system/audit/entries` (cursor), `GET /system/tenants`
  (200, empty dev data).
- Backend behaviours confirmed live (not bugs): cookie-CSRF guard requires
  `X-Requested-With` (the shared client injects it on refresh/logout/switch-tenant);
  the refresh cookie is **rotated at session open** (clients must store the new
  cookie — browsers do); TOTP anti-replay rejects a reused 30 s window code; a
  logged-out bearer stays valid until its 300 s expiry (frontend clears it in memory).
- TOTP verification technique for future sessions: the dev secret is AES-GCM
  encrypted with `SYSTEM_TOTP_KEY` from backend `.env`; decrypt + `pyotp` compute a
  code in-memory (no secrets printed). **Anti-replay: wait for the next 30 s window
  when re-testing.**

## Verified checks

- **Typecheck: 0 errors** — executed as `bun node_modules/vue-tsc/bin/vue-tsc.js
  --noEmit -p tsconfig.app.json` (Bun runtime; **canonical Node command still owed
  by the user** — `node` is not installed here).
- **Lint:** exit 0 (`bun run lint`; pre-existing boundaries descriptor warning only).
- **Tests:** 118 pass / 0 fail / 0 skipped across 18 files (incl. the new
  `languageDisplay` suite and the rewritten system-admin mapper/repository suites).
- **Build:** `rm -rf dist && bun x vite build` → exit 0.
- **Live API:** see the runtime section above. Browser-rendered passes (menu
  visibility per role, wrapped sidebar labels, language selectors) remain the user's
  visual check — no browser tooling in this environment.

## Environment facts (verified this session where noted)

- Backend seed: **all 505 frontend seed keys are present in
  `../backend/seed/phrases.json`** (user synced it; verified programmatically,
  including the 13 keys added this session). **DB re-seeded**: the new keys exist in
  `i18n.phrases`; languages revision 231.
- Dev DB: superadmin `superadmin@mfin.uz` (role `superadmin`, active, TOTP enrolled,
  password from `SEED_SUPERADMIN_PASSWORD` in backend `.env`). **No tenants** and no
  operator/i18n_editor accounts exist — role-specific UI and tenant-detail pages
  cannot be exercised without creating data (forbidden in audits).
- `i18n.languages` codes are hyphenated (`uz-Cyrl`); the API serves `name` (English)
  + `native_name` (native labels) — the frontend now uses `native_name`.

## Open items

1. Canonical Node-based typecheck re-run by the user (expect 0).
2. Browser passes: SYSTEM area (organizations list/detail incl. members, staff
   pages, audit cursor, settings language save) with real tenant data — the dev DB
   has **no tenants**; creating one is a write the audits avoided.
3. Role-matrix UI verification for `operator`/`i18n_editor` — no such accounts exist
   (creating them was forbidden); the role→permission map is verified live via
   `GET /system/permissions`.
4. Optional future features (Python endpoints exist or are desired): dashboard
   aggregates (currently labelled sample data), staff-creation UI
   (`POST /system/users` exists), audit-verify UI (`/system/audit/verify` exists),
   i18n-management UI (`/system/i18n/*` exists, no consumer).
5. Deferred (explicit user decision): make a failed i18n content load visible
   (loader returns `{lang, loadedAny}`; see
   `sessions/2026-11-11-system-auth-totp-and-i18n-diagnosis.md`).
6. Transitional debt: SYSTEM session expiry still derives from an unverified JWT
   claim (`readExpiryFromToken` in `container.ts`) until `/system/auth` returns
   `expires_in`/tenant data — tracked in DECISIONS.
7. Carried-over UNKNOWNs: whether `/identity/me.tenants[]` always contains the
   personal tenant; exact backend password policy beyond the 8-char minimum.

## Verified contract facts (fast reference)

- SYSTEM control plane: `GET /system/tenants?limit&offset&type&status` →
  `{items, total}`; `GET /system/tenants/{id}` → `{tenant, member_count,
  document_counts}`; `POST .../suspend|reactivate` (body `{reason}` 1..200) →
  `SystemTenantResponse`; `GET .../users` → `{items, total}` of
  `{user_id, role, status, full_name, email_masked, phone_masked, identity_status}`;
  `GET|PATCH /system/users(/:id)` (singular `role`; status `active|disabled`);
  `GET /system/permissions` → `{permissions[], roles{}}`;
  `GET /system/audit/entries?limit&cursor&occurred_from&occurred_to…` →
  `{items, next_cursor}` (flat entries incl. `seq`, `request_id`); no audit-detail,
  no user-block/revoke, no global user directory endpoints exist.
- Auth realm: `/system/auth/*` unchanged from the previous handoff; `me` carries
  `permissions: string[]` and singular `role`; `SystemTokenResponse` has
  `{access_token, expires_in}` only.
- Language codes: API `uz|uz-Cyrl|ru|en` (hyphen); internal `uz|uzc|ru|en`;
  `fromApiLang` additionally tolerates `uz_Cyrl` (underscore) for display lookups.
