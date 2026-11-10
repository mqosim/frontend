# Current state

## Repository facts (verified 2026-11-10)

- Branch: `main`. Work stays on `main`; the AGENTS.md `api-migration` branch rule is obsolete for this migration (explicit user decision). At handoff start the working tree was clean (nothing staged); this handoff then modified the tracked memory files `CURRENT_STATE.md` and `DECISIONS.md`, plus the git-ignored `TASK_LOG.md` and `sessions/*`.
- Recent commits:
  - `57bfe3d` — `feat(auth): migrate password+OTP registration to FastAPI contract` (15 files, +996/−48)
  - `f653ae4` — `docs(memory): record i18n loader migration handoff`
  - `4831756` — `refactor(i18n): migrate public content loader to FastAPI contract` (5 files)
- Tooling (`package.json`):
  - `typecheck`: `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.app.json`
  - `build`: typecheck + `vite build`
  - `lint`: `eslint .`
  - `format:check`: `prettier --check .`
  - **No `test` script.** Permanent tests run with Bun directly:
    `bun --tsconfig-override=tsconfig.app.json test tests/`.
  - Test files (6): `tests/auth/registerMappers.test.ts`,
    `tests/i18n/phrasesSeed.test.ts`,
    `tests/system-admin/{auditLogRepository,mappers,permissions}.test.ts`,
    `tests/system-auth/systemAuthRepository.test.ts`.
- Dev environment: `vite.config.ts` proxies `/api` to `http://127.0.0.1:8000` (FastAPI). Always browse `http://localhost:5173`, not `127.0.0.1`: it keeps the `Secure; SameSite=None` refresh cookie and must be present in the backend's `CORS_ALLOW_ORIGINS` and `SYSTEM_CORS_ALLOW_ORIGINS` (Origin is checked on refresh/logout/switch-tenant).
- `.opencode/memory/*` is git-ignored (`.gitignore:29`). `CURRENT_STATE.md`, `DECISIONS.md` and `PROJECT.md` are tracked despite matching that pattern (they were added before the ignore); `TASK_LOG.md` and `sessions/*` are ignored.

## API migration status

- Phase 0 (dev proxy target) — done.
- Auth Phase 2 (auth infrastructure + domain rebuild) — done, committed in `8400663`.
- Auth Phase 3 (session runtime, guard bootstrap, pending-workspace removal) — done, committed in `8400663`.
- Auth Phase 4 (manual browser test plan) — plan delivered; **browser tests not executed**.
- i18n public content loader — done, committed in `4831756`: active languages + translations repositories, repeatable `page`, internal `uzc` ↔ API `uz-Cyrl` mapping, 20-page chunking, actual-served-language adoption, 304 branch retained.
- Password+OTP registration — done, committed in `57bfe3d`: `POST /identity/register/start` and `/identity/register/complete`, `Accept-Language`, session adoption identical to password login, resend/cooldown, `full_name` normalization. The E-IMZO-only `/register` screen was replaced; `EimzoRegisterPanel.vue` is now unreachable and untouched.
- Still on the old contract: SYSTEM/admin, E-IMZO login/register/link, password/email change, language saving (settings/system-auth).

## Verified checks

- Password+OTP registration throwaway runtime experiment (`bun --tsconfig-override`,
  real `createApiClient` + `createAuthRepository`, mocked fetch) — **23/23 checks
  passed**; directory deleted. Covered: start/complete bodies, `Accept-Language`,
  no bearer/CSRF/idempotency, cookie credentials only on complete, 202/201
  mapping, PERSON/ORG principal, 9 error codes + network, no backend-message
  leakage, 401 no-retry, failed complete stores nothing, `full_name`/identifier
  normalization, resend gating + 429 cooldown + new `pending_id`.
- `bun --tsconfig-override=tsconfig.app.json test tests/` after `57bfe3d` —
  **44 pass, 0 fail**, 588 `expect()` calls, 6 files.
- `bun run lint` after `57bfe3d` — exit 0 (only the pre-existing `boundaries`
  descriptor warning).
- `bun run format:check` after `57bfe3d` — exit 1, **4 pre-existing, unmodified
  files**: `AGENTS.md`, `.opencode/memory/CURRENT_STATE.md`,
  `src/app/components/UserMenu.vue`,
  `src/features/auth/presentation/components/WorkspaceSwitchDialog.vue`. All 15
  files changed by `57bfe3d` pass Prettier (verified with a targeted
  `bunx prettier --check`).
- Authoritative Node-based `vue-tsc`: **not run by the agent**; the user runs it.
  Bun runs do not cover `.vue` files.
- Last user-run Node `vue-tsc` (before the i18n migration) — exit 2, **48
  errors** = 42 source + 6 `.vue` call sites (`EimzoLoginPanel.vue`,
  `EimzoRegisterPanel.vue`, `ChangeEmailCard.vue` ×2, `ChangePasswordCard.vue`,
  `LanguageSettingsSection.vue`). Post-i18n and post-registration Node results
  are **not verified** here.
- i18n throwaway runtime experiment (earlier) — 11/11 checks passed.
- Auth throwaway runtime experiment (earlier) — 26/26 checks passed.
- Grep proof for `workspace_required`, `requiresPendingWorkspace`,
  `setWorkspaceRequired`, `needsWorkspace`, `WorkspaceSelectionPage`,
  `/workspaces` — no matches.
- `bun run build` was not run (it runs `vue-tsc` first and would stop on the
  out-of-scope errors).

## Verified contract facts

- Registration start: `POST /api/v1/identity/register/start`, body
  `{identifier}`, anonymous, 202 → `{pending_id, expires_in, resend_after}`.
  Resend is a second start; before `resend_after` it returns 429 `rate_limited`
  with `Retry-After`; after the cooldown it creates a **new** `pending_id` and
  sends a new code (user-verified against the backend).
- Registration complete: `POST /api/v1/identity/register/complete`, body
  `{pending_id, code, password, full_name}`, anonymous, sets the refresh cookie,
  201 → `TokenResponse`. Server password minimum is 8 chars; `weak_password` is
  authoritative (the client checks non-empty only).
- `full_name` backend rule: collapse whitespace, trim, 2..200 chars, no control
  characters.
- `Accept-Language` is documented in `.audit/frontend-contract-notes.md` but is
  not declared on the register paths in OpenAPI; it is sent via openapi-fetch's
  `headers` option using `toApiLang`.
- Login identifier: the backend's `normalize_phone` accepts `+998…`,
  `998XXXXXXXXX` and 9-digit forms; the client normalizes phones to digits only.
  Email is lowercased server-side. Registration reuses the same normalization.
- `GET /api/v1/public/languages/active` → `{languages: [{code, name,
  native_name, script, is_default, sort_order}], revision}`; all six
  `LanguageView` fields are required.
- `GET /api/v1/public/translations` takes repeatable `page` (canonical; legacy
  `pages` alias exists), `lang`; returns `{lang, revision, messages:
  {page: {word: text}}}`. Max 20 pages (`too_many_pages`, 422). A page with no
  phrases is omitted. Unknown/inactive `lang` → 200 with the default language
  and the actual code in `lang`; non-language tags → 404. ETag/304 are supported.
- Canonical `lang`: `uz` (default), `uz-Cyrl`, `ru`, `en`. Input aliases `uzc`
  and `uz-Cyrl-UZ` normalize to `uz-Cyrl`.
- Internal app locale codes remain `uz`, `uzc`, `ru`, `en`; `uzc` maps to the
  API's `uz-Cyrl`. The mapping lives in
  `features/i18n/domain/localeCodes.ts`.

## Open items

- Run the authoritative Node-based `bun run typecheck` after `57bfe3d`; confirm
  no new errors and that the 6 known `.vue` errors are unchanged. Bun cannot see
  `.vue` errors.
- Execute the Auth Phase 4 manual browser plan, now including the new password+OTP
  registration flow, and record pass/fail per test id.
- `bun run format:check` fails on 4 pre-existing unmodified files (listed above);
  decide whether to format them in a separate change.
- UNKNOWN: whether `/identity/me.tenants[]` always contains the personal tenant
  (list is rendered as returned).
- UNKNOWN: exact backend password policy beyond the 8-char minimum.
- Out of scope and still red: the old-contract Bun pre-check errors
  (system-admin/system-auth/E-IMZO) plus the 6 known `.vue` call sites that only
  the Node-based run can see.
- i18n ETag revalidation is intentionally **not** wired (the 304 branch exists
  but `If-None-Match` is never sent); no negative caching for omitted pages.
