# Current state

## Repository facts (verified 2026-11-11)

- Branch: `main`. Work stays on `main`; the AGENTS.md `api-migration` branch rule is obsolete for this migration (explicit user decision). At handoff start the working tree was clean (nothing staged). This handoff then modifies the tracked memory files `CURRENT_STATE.md` and `DECISIONS.md`, plus the git-ignored `TASK_LOG.md` and `sessions/*`.
- Recent commits:
  - `81f7687` — `feat(system-auth): migrate SYSTEM sign-in to password + TOTP` (18 files, +1410/−199)
  - `4ea837a` — `feat: migrate registration, E-IMZO and language preferences to the new contract`
  - `6c01f2b` — `docs(memory): record password+OTP registration handoff`
  - `57bfe3d` — `feat(auth): migrate password+OTP registration to FastAPI contract`
  - `f653ae4` — `docs(memory): record i18n loader migration handoff`
  - `4831756` — `refactor(i18n): migrate public content loader to FastAPI contract`
- Tooling (`package.json`):
  - `typecheck`: `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.app.json`
  - `build`: typecheck + `vite build`
  - `lint`: `eslint .`
  - `format:check`: `prettier --check .`
  - **No `test` script.** Permanent tests run with Bun directly:
    `bun --tsconfig-override=tsconfig.app.json test tests/`.
  - Test files (13): `tests/auth/{eimzoRepository,registerMappers,registrationErrors}.test.ts`,
    `tests/i18n/phrasesSeed.test.ts`,
    `tests/notifications/{notificationPreferencesRepository,useCases}.test.ts`,
    `tests/shared/{eimzoErrorKeys,httpErrors,jwtDecode}.test.ts`,
    `tests/system-admin/{auditLogRepository,mappers,permissions}.test.ts`,
    `tests/system-auth/systemAuthRepository.test.ts`.
- Dev environment: `vite.config.ts` proxies `/api` to `http://127.0.0.1:8000`
  (no rewrite; spec paths already carry `/api/v1`). Always browse
  `http://localhost:5173`, not `127.0.0.1`: it keeps the
  `Secure; SameSite=None` cookies and must be present in the backend's
  `CORS_ALLOW_ORIGINS` and `SYSTEM_CORS_ALLOW_ORIGINS`.
- `.opencode/memory/*` is git-ignored (`.gitignore:29`). `CURRENT_STATE.md`,
  `DECISIONS.md` and `PROJECT.md` are tracked despite that pattern;
  `TASK_LOG.md` and `sessions/*` are ignored.

## API migration status

- Phase 0 (dev proxy target) — done.
- Auth Phase 2 + 3 (auth infrastructure, session runtime, guard bootstrap,
  pending-workspace removal) — done, committed `8400663`.
- i18n public content loader — done, committed `4831756`.
- Password+OTP registration — done, committed `57bfe3d`.
- Registration (email+phone), E-IMZO login/link and notifications language
  preference — done, committed `4ea837a`.
- SYSTEM auth (steps 6a/6b/6c) — done, committed `81f7687`: two-step sign-in
  (`POST /system/auth/login` → pre-auth token → `POST /system/auth/totp`),
  TOTP enrollment (`/totp/enroll`, `/totp/activate`, one-time recovery codes)
  and a `SystemLoginPage` state machine
  `credentials → (enroll → activate → recovery) → totp → dashboard`.
  No SYSTEM saved-language endpoint exists, so the SYSTEM language section
  switches the browser only (`SystemSettingsPage.vue` `apply` prop).
- Still on the old contract:
  - `features/system-admin` (`adminRepository.ts`, `auditLogRepository.ts`)
    calls `/api/v1/admin/*`; the new contract has `/api/v1/system/*` and
    `/api/v1/audit/entries` instead. Those paths are absent from
    `schema.ts`, so these calls are type errors and would 404 at runtime.
    This is the main remaining migration gap.
  - Password/email change screens were removed (files deleted in `4ea837a`);
    the new contract exposes no such endpoints.
- `features/documents` does not exist in this SPA yet (no repository/screens).
  `features/wallet` uses a placeholder service.

## Environment facts (verified 2026-11-11)

- Backend repo is at `c591729` (`Standardize seeding on seed/ with a generic
  seeder runner`). The legacy `docs/i18n/legacy/` seed is gone; the i18n seed
  now lives in `../backend/seed/{pages.json,phrases.json}` and is applied with
  `make seed [DRY=1]` (`PYTHONPATH=src python scripts/seed.py`).
- Dev DB `appdb` (Postgres 5432, docker `backend-postgres-1`) currently holds
  **13 pages / 458 phrases / 458 translations per language** for `uz`,
  `uz-Cyrl`, `ru`, `en`; `i18n.revision.revision = 2`,
  `updated_at 2026-11-11 07:03 UTC`. Pages include `common`, `settings`,
  `org`, `system.admin`, `auth.login`, `auth.register`, `errors`, `dashboard`,
  `home`, `system.login`; `settings.profile` and `notifications` exist with no
  phrases. The earlier `sysaudit*` test leftovers are gone.
- The frontend seed `docs/phrases-to-seed.json` has 490 keys; **60 are absent
  from the seeded DB** (all `auth.otp_*`/registration keys, several
  `errors.eimzo_*`, `errors.account_blocked`, …) and 28 DB keys are not in the
  frontend file. Those 60 keys will render the English fallback.
- At handoff time the FastAPI backend was **not running** (:8000 closed) and
  the Vite dev server was not running (:5173). Postgres, Redis, RustFS and
  Mailpit containers were up.

## Language-switch diagnosis (2026-11-11, read-only, no code change)

- Symptom: switching the UI language left every string English in both the
  regular app and the SYSTEM area; the selector/flag and
  `localStorage['app.lang']` did change.
- Root cause **at diagnosis time**: the DB had no UI translation catalog
  (only 40 `sysaudit*` test pages and 80 `en` rows), so every
  `GET /api/v1/public/translations?page=…` returned 404. The loader maps 404
  to `not-found` (`publicContentRepository.ts:25-26`), keeps the embedded
  English messages (`loader.ts:79-90,106-113`) and `switchTo` still flips the
  locale (`plugin.ts:80-86`). Verified by psql + Redis (no cache keys) + code.
- The seed has since been run (revision 2, see above), so the data cause is
  addressed; **whether the switch now renders translations is UNVERIFIED** —
  the app was never run.
- Proposed but NOT implemented: make a fully failed load visible (loader
  `ensure` returning `{lang, loadedAny}`, `switchTo` keeping the previous
  locale) plus a loader test that feeds a 404 for every page.

## Verified checks

- This session: no `typecheck`, `lint`, test, build or app run was executed by
  the agent. The committed tests (`systemAuthRepository.test.ts` +487/−71,
  new `tests/shared/jwtDecode.test.ts` +85) have **no verified result yet**.
- Earlier (pre-`81f7687`, for the record): password+OTP registration throwaway
  runtime experiment 23/23; `bun --tsconfig-override=tsconfig.app.json test
  tests/` 44 pass / 0 fail (6 files then); `bun run lint` exit 0 (pre-existing
  boundaries descriptor warning); `format:check` exit 1 on 4 pre-existing
  unmodified files.
- Authoritative Node-based `vue-tsc`: **not run by the agent**; the user runs
  it. Bun runs do not cover `.vue` files. The known red area is now
  `features/system-admin` (`/api/v1/admin/*` absent from `schema.ts`).

## Verified contract facts

- SYSTEM realm (`schema.ts:595-735`): `POST /api/v1/system/auth/login`
  (password → pre-auth token), `POST /api/v1/system/auth/totp` (TOTP or
  recovery code), `/totp/enroll`, `/totp/activate`, `/refresh`, `/logout`,
  `GET /me`. The pre-auth token travels only in `X-System-Pre-Auth` and is
  held in memory inside the repository; it is never exposed to
  application/presentation code.
- SYSTEM tokens are identified by `aud: "system"` (string or list); the
  pre-auth token carries `aud: "system-preauth"`. Claims are decoded without
  verifying the signature and never gate access.
- Registration start now takes `{email, phone}` (both required,
  `schema.ts:1729-1740`); complete takes `{pending_id, code, password,
  full_name}`; both send `Accept-Language` via `toApiLang`.
- `GET /api/v1/public/languages/active` → `{languages: [{code, name,
  native_name, script, is_default, sort_order}], revision}`.
- `GET /api/v1/public/translations` takes repeatable `page` (legacy `pages`
  alias exists), `lang`; returns `{lang, revision, messages:
  {page: {word: text}}}`. Max 20 pages (`too_many_pages`, 422); unknown page
  slug → 404 for the whole request; unknown/inactive `lang` → 200 with the
  default language and its actual code. ETag/304 supported.
- Canonical `lang`: `uz` (default), `uz-Cyrl`, `ru`, `en`; internal codes stay
  `uz`, `uzc`, `ru`, `en` with `uzc` ↔ `uz-Cyrl` mapping in
  `features/i18n/domain/localeCodes.ts`.
- Notifications preferences `PUT /api/v1/notifications/preferences` is a full
  replacement; the language lives there (not in `/identity/me`) and uses the
  `Locale` enum `uz | uz-Cyrl | ru | en`.

## Open items

- Run the authoritative Node-based `bun run typecheck`. Expected red: the
  `features/system-admin` calls to `/api/v1/admin/*` (paths absent from the
  contract), plus any pre-existing `.vue` errors. Do not claim Bun coverage of
  `.vue`.
- Migrate `features/system-admin` (admin + audit) to `/api/v1/system/*` and
  `/api/v1/audit/entries`, mapping the new envelopes without changing UI
  shapes.
- Re-test language switching now that the catalog is seeded (regular settings,
  SYSTEM settings, login/landing). If it still fails, follow the diagnosis
  trace in `sessions/2026-11-11-*.md` (DevTools + curl plan).
- Reconcile the two seeds: 60 frontend keys (OTP registration, E-IMZO errors,
  settings) are missing from `../backend/seed/phrases.json`, so those screens
  fall back to English. Decide the canonical seed file before adding more keys.
- Browser/manual tests (auth Phase 4, registration, SYSTEM 2-step + TOTP) have
  not been executed.
- UNKNOWN: whether `/identity/me.tenants[]` always contains the personal
  tenant. UNKNOWN: exact backend password policy beyond the 8-char minimum.
