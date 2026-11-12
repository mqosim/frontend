# Current state

## Repository facts (verified 2026-11-12, end of session)

- Branch: `main`, HEAD `bd375e6`, **ahead 1** of `origin/main` (nothing pushed). Work
  stays on `main`; the AGENTS.md `api-migration` branch rule is obsolete for this
  migration (explicit user decision, 2026-11-10). Working tree **clean** at handoff
  time (before this handoff edits the tracked memory files).
- Recent commits (newest first):
  - `bd375e6` — `feat(system-admin): align the i18n Manager with the FastAPI roles`
    (51 files, +4277/−521). Permission-derived SYSTEM gates, the full i18n catalog
    UI, audit chain verification, an in-shell access-denied view, a navigation-only
    dashboard, and the catalog UI proportion/action/selector fixes.
  - `3f56a99` — sidebar labels wrap instead of clipping (2 files, CSS only).
  - `676d2d9` — native language names + the `uz_Cyrl` flag (7 files).
  - `ff0b66b` — SYSTEM control plane on the FastAPI contract (33 files).
  - Memory-only commits by the user: `9ec6e1a`, `c0cb9e2`, `cba8452`, `7d42336`,
    `9e1a709`.
- **`node` IS installed** (`v26.13.0`, fnm shim) — earlier handoffs recorded it as
  missing. `bun run typecheck` executes that Node binary and therefore **does** cover
  `.vue` files; the Bun-invoked `vue-tsc` silently skips them (proved this session
  with a deliberately broken SFC: Bun exit 0, Node `TS2307` exit 2).
- Tooling (`package.json`, re-verified): `typecheck` =
  `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.app.json`;
  `build` = typecheck + `vite build`; `lint` = `eslint .`; `format` / `format:check`;
  `api:generate` = `openapi-typescript openapi/openapi.json -o …/schema.ts`;
  `api:refresh` = `bun scripts/refresh-openapi.mjs`. **No `test` script** — run
  `bun --tsconfig-override=tsconfig.app.json test tests/`.
- Test files (22): `tests/auth/{eimzoRepository,languageRepository,profileMappers,registerMappers,registrationErrors}`,
  `tests/i18n/{languageDisplay,localeCodes,messageCompilation,phrasesSeed}`,
  `tests/notifications/{notificationPreferencesRepository,useCases}`,
  `tests/shared/{eimzoErrorKeys,httpErrors,jwtDecode}`,
  `tests/system-admin/{access,auditLogRepository,i18nMappers,i18nRepository,mappers,permissions}`,
  `tests/system-auth/{enrollmentQr,systemAuthRepository}` (all `.test.ts`).
- Dependencies unchanged since `uqr ^0.1.3` (QR, dynamically imported only).
- Dev environment: `vite.config.ts` proxies `/api` → `http://127.0.0.1:8000` (Python
  backend). Browse `http://localhost:5173` (secure-context cookie requirement).
  Backend start: `cd ../backend && .venv/bin/uvicorn app.main:app --app-dir src --port 8000`
  (`make run` fails here: `uvicorn` is not on the system PATH).
- There is **no Go backend** on this machine (`~/projects` = `backend` (Python),
  `frontend`, `api-client` (Bruno collection, baseUrl `http://localhost:8000`)). The
  Go contract survives only in git history.

## API migration status

- **Both SYSTEM features and the i18n Manager run 100% on the FastAPI contract.**
  Zero `/api/v1/admin` references. Every path the repositories call — including the
  eight `/api/v1/system/i18n/*` operations and `/api/v1/system/audit/verify` — exists
  in the generated `schema.ts` (generated from `openapi/openapi.json`).
  `api:generate` was **not** re-run; the schema already contained them.
- Committed: auth Phase 2+3, i18n loader, registration, E-IMZO + notifications
  language, SYSTEM auth 6a–6c, TOTP-enroll QR, saved-language fields, the SYSTEM
  control plane, and (`bd375e6`) the i18n Manager + permission-derived gating.
- system-admin design after `bd375e6`:
  - **Permissions are the only gate.** `tenants.read` is never substituted for
    `system.users.read`. Backend map (`../backend/src/modules/system/domain/permissions.py`):
    superadmin = all 9; operator = `{tenants.read, tenants.users.read, i18n.read,
    audit.read}`; i18n_editor = `{i18n.read, i18n.manage}`; unknown roles grant
    nothing.
  - `AdminIdentity.role` is singular (`string | null`), mirroring
    `SystemMeResponse.role`; the permission list stays authoritative for gates.
  - Dedicated routes `/system/i18n`, `/system/audit`, `/system/access-denied`;
    `/system/:module` and `/system` redirect to the dashboard. The generic
    placeholder page (`SystemModulePage.vue`) and `domain/systemSampleData.ts` are
    deleted; the Subscriptions/Products/Reports nav entries are gone.
  - A direct visit without the route's permission renders the **in-shell**
    access-denied view (retry + link to the first permitted area). The guard
    resolves `/system/auth/me` before any permission decision, so there is no
    permission flash and no silent redirect.
  - Dashboard = navigation cards only, each gated by its own permission, no
    statistics; an i18n-only caller gets the `catalogOnly` welcome notice.
  - i18n catalog: `i18n.read` opens the page; `i18n.manage` enables mutations and
    the Import tab. Tabs: languages (activate / make default — the four codes are
    fixed server-side, no create/delete), pages (create / edit / delete only when
    empty), phrases (key cursor + upsert/delete), missing-value report, seed-shaped
    bulk import (dry-run + overwrite, conflicts reported).
  - Audit: `audit.read` lists (cursor + period presets); `audit.verify` alone
    enables `GET /system/audit/verify`.
  - Tenant members require `tenants.users.read` independently of `tenants.read`.
- Control-plane rules from `ff0b66b` unchanged: members listed read-only on the
  tenant detail page, audit rows expand from the list item, client-side search with
  a scope notice, reason-gated suspend/reactivate, singular-role staff PATCH with
  contract-checked values.
- Language selector (`676d2d9`) and sidebar wrap (`3f56a99`) fixes unchanged.
- Architecture audit (2026-11-12, read-only): system-admin → system-auth via public
  barrels only; no reverse imports, no cycles; `useSystemLogout` stays in
  system-admin (mirrors `useOrgLogout`).

## Verified checks (executed this session)

- Typecheck: **0 errors** — `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit
  -p tsconfig.app.json` (Node v26.13.0); re-run after the final CSS change and again
  after the commit.
- Lint: **exit 0** (`bun run lint`; only the pre-existing `boundaries`
  element-pattern warning about `src/features/*/index.ts` descriptors).
- Tests: **168 pass / 0 fail / 0 skipped**, 22 files, 1043 assertions
  (`bun --tsconfig-override=tsconfig.app.json test tests/`).
- Build: **exit 0** (`./node_modules/.bin/vite build`, ~0.8 s) after the UI
  refinements; the emitted CSS was grepped to confirm the new scoped rules are in
  the bundle (`admin-page--wide`, `.i18n-select`, `.i18n-field .admin-toolbar__input`,
  `admin-table__actions--nowrap`).
- Prettier: `--check` clean on every touched path, including the seed.
- Not executed: `api:generate`, dev server, browser/visual passes, DB writes.

## Environment facts

- Translation seed: `docs/phrases-to-seed.json` and `../backend/seed/phrases.json`
  are **byte-identical** (verified with `cmp`): 11 groups, **601 keys**. The repo copy
  gained 96 keys and 2 rewritten values (`system.dash_title`, `system.dash_subtitle`)
  in `bd375e6`.
- **The backend dev DB reseed for those 96 keys is UNVERIFIED** (no DB access this
  session). Until the seeder runs, the new i18n strings render from the embedded
  English fallback.
- Dev DB contents as recorded by the previous session (**not re-verified**):
  superadmin `superadmin@mfin.uz` only; **no tenants**, no `operator`/`i18n_editor`
  accounts.
- `i18n.languages` codes are hyphenated (`uz-Cyrl`); the API serves `name` +
  `native_name`, and the frontend displays `native_name`.

## Open items

1. Push `bd375e6` (`git push origin main`).
2. Re-seed the backend DB so the 96 new keys exist in `i18n.phrases`; then check the
   i18n Manager tabs in a browser.
3. Browser/visual passes: i18n Manager (five tabs), access-denied for a read-only
   caller, dashboard cards per role, the widened catalog column and the page selector
   at desktop width and at ≤768 px.
4. Role-matrix UI verification for `operator`/`i18n_editor`: no such accounts and no
   tenant data exist in the dev DB; creating them was not authorized. The
   role→permission map is verified from the backend source and by
   `tests/system-admin/access.test.ts`.
5. Optional product backlog: dashboard aggregates, staff-creation UI
   (`POST /system/users` exists). Audit verification and i18n management are done.
6. Deferred (user decision): make a failed i18n content load visible (see
   `sessions/2026-11-11-system-auth-totp-and-i18n-diagnosis.md`).
7. Transitional debt: SYSTEM session expiry derives from an unverified JWT claim
   (`readExpiryFromToken` in `container.ts`) until `/system/auth` returns expiry data.
8. Unused seed keys left in place deliberately (seed edits are the user's call):
   dashboard sample-stat phrases (`system.dash_card_*`, `system.dash_reg_*`,
   `system.dash_activity_title`, `system.dash_sample_notice`, `system.page_placeholder`,
   `system.nav_subscriptions/products/reports`) and the pre-existing user-action
   phrases.
9. Carried-over UNKNOWNs: whether `/identity/me.tenants[]` always contains the
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
  `{items, next_cursor}` (flat entries incl. `seq`, `request_id`);
  `GET /system/audit/verify` → `{ok, rows_checked, verified_from_seq, truncated,
  first_bad_seq?, head_seq?}`; no audit-detail, no user-block/revoke, no global user
  directory endpoints exist.
- i18n management: `GET /system/i18n/languages` → `{items}`;
  `PATCH /system/i18n/languages/{code}` (`is_active`, `is_default`);
  `GET|POST /system/i18n/pages`, `PATCH|DELETE /system/i18n/pages/{page_key}`
  (delete only when empty → 409 `page_not_empty`);
  `GET /system/i18n/phrases?page&limit&cursor` → `{items, next_cursor}`,
  `PUT|DELETE /system/i18n/phrases/{page_key}/{phrase_key}` (body `{values}`);
  `GET /system/i18n/missing` → `{items}`; `POST /system/i18n/import`
  (seed shape + `overwrite` + `dry_run`). Machine codes:
  `language_default_required`, `language_last_active`, `language_not_found`,
  `page_key_taken`, `page_not_empty`, `phrase_key_taken`, `phrase_not_found`,
  `invalid_translation_key`, `invalid_translation_value`,
  `translation_value_too_long`, `import_too_large`.
- Auth realm: `/system/auth/*` unchanged; `me` carries `permissions: string[]` and a
  singular `role`; `SystemTokenResponse` has `{access_token, expires_in}` only.
- Language codes: API `uz|uz-Cyrl|ru|en` (hyphen); internal `uz|uzc|ru|en`;
  `fromApiLang` also tolerates the underscore form for display lookups.
