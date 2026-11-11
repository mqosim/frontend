# Current state

## Repository facts (verified 2026-11-11, end of session)

- Branch: `main`. Work stays on `main`; the AGENTS.md `api-migration` branch rule is
  obsolete for this migration (explicit user decision, 2026-11-10). Working tree is
  **clean** at handoff time (before this handoff edits the tracked memory files).
- Recent commits (this session's work first):
  - `efeaa16` — `feat(settings): save the account language through the new backend
    fields` (27 files, +1164/−213; includes the user's regenerated
    `openapi/openapi.json` + `src/shared/infrastructure/api/schema.ts`).
  - `9e1a709` / `7e239e4` — user-committed memory files (`CURRENT_STATE.md`,
    `DECISIONS.md`).
  - `ebe02c4` — `feat(system-auth): add scannable QR code to TOTP enroll step`
    (7 files, +208/−2; adds the `uqr` dependency).
  - `81f7687` — `feat(system-auth): migrate SYSTEM sign-in to password + TOTP`.
- Tooling (`package.json`, re-verified):
  - `typecheck`: `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.app.json`
  - `build`: typecheck + `vite build`; `lint`: `eslint .`; `format:check`: `prettier --check .`
  - `api:generate`: `openapi-typescript openapi/openapi.json -o src/shared/infrastructure/api/schema.ts`
  - **No `test` script.** Tests run with Bun directly:
    `bun --tsconfig-override=tsconfig.app.json test tests/`.
  - Test files (17, re-verified by listing): `tests/auth/{eimzoRepository,languageRepository,profileMappers,registerMappers,registrationErrors}.test.ts`,
    `tests/i18n/{localeCodes,phrasesSeed}.test.ts`,
    `tests/notifications/{notificationPreferencesRepository,useCases}.test.ts`,
    `tests/shared/{eimzoErrorKeys,httpErrors,jwtDecode}.test.ts`,
    `tests/system-admin/{auditLogRepository,mappers,permissions}.test.ts`,
    `tests/system-auth/{enrollmentQr,systemAuthRepository}.test.ts`.
- New dependency: `uqr ^0.1.3` (QR encoder, zero-dep, ESM, MIT; only imported
  dynamically in `features/system-auth/presentation/enrollmentQr.ts`).
- Dev environment: `vite.config.ts` proxies `/api` to `http://127.0.0.1:8000` (no
  rewrite). Always browse `http://localhost:5173` (cookie/CORS requirement).
- `.opencode/memory/*` is git-ignored (`.gitignore:29`); `CURRENT_STATE.md`,
  `DECISIONS.md`, `PROJECT.md` are tracked anyway; `TASK_LOG.md` and `sessions/*`
  are ignored. `AGENTS.md` and `.audit/` were not modified this session.

## API migration status

- Done and committed: auth Phase 2+3 (`8400663`), i18n public content loader
  (`4831756`), password+OTP registration (`57bfe3d`), registration/E-IMZO/
  notifications-language (`4ea837a`), SYSTEM auth 6a/6b/6c (`81f7687`),
  TOTP-enroll QR code (`ebe02c4`), saved-language fields (`efeaa16`).
- Saved-language integration (commit `efeaa16`) — what exists now:
  - `language_code` mapped from `MeResponse` and `SystemMeResponse` into
    `UserProfile.languageCode`; the **router guard adopts it once per session in
    BOTH contexts** (`guards.ts`: `regularLanguageApplied` / `systemLanguageApplied`).
  - Regular save: `LanguageSettingsSection.onSave` = `PATCH /identity/me` first →
    `i18n.switchTo` → notification sync (`GET` prefs then full-replacement `PUT`,
    reused `notifications.saveLocale`); sync failure is a soft warning
    (`settings.language_sync_failed`), the language stays switched.
  - SYSTEM save: `SystemSettingsPage.applyLanguage` = `PATCH /system/auth/me` via
    `system.updateLanguage`, throws `AppError` on failure (section maps by machine
    code), then `switchTo`; no notifications for SYSTEM.
  - Registration: `register/start` body carries `language_code`
    (`toApiLanguageCode(getCurrentLocale())`); `Accept-Language` header unchanged.
  - Typing: `ApiLanguageCode` union (`i18n/domain/localeCodes.ts`) +
    `toApiLanguageCode()` (null for unsupported codes) + schema-derived
    `ApiLanguageCodeDto` with a compile-time equality proof in
    `auth/infrastructure/mappers.ts` (`API_LANGUAGE_CODE_MATCHES_SCHEMA`).
    Ports/use cases take `ApiLanguageCode` end to end; no casts.
  - New i18n keys: `errors.language_unsupported`, `settings.language_sync_failed`
    (fallback + seed, 4 locales). QR keys from `ebe02c4`:
    `system.enroll_qr_label`, `system.enroll_qr_hint`.
- Still on the old contract: `features/system-admin` (`adminRepository.ts`,
  `auditLogRepository.ts` call `/api/v1/admin/*`, absent from the contract).
  **User-reported vue-tsc baseline: 31 errors, all in system-admin/infrastructure;
  must not increase.** The user's mentioned-but-unscoped remainder there is the
  "administrator permissions" warning area (6d–6g).
- Password/email change screens remain removed (no such endpoints).
- `features/documents` does not exist; `features/wallet` uses a placeholder service.

## Environment facts (carried over; verified earlier 2026-11-11, NOT re-verified this session)

- Backend repo was at `c591729` at the earlier handoff; the user regenerated
  `openapi/openapi.json` from a newer export during this session, so the backend
  has moved — exact backend HEAD is UNVERIFIED.
- Dev DB (earlier verification): 13 pages / 458 phrases / 458 translations per
  language, revision 2; the i18n seed lives in `../backend/seed/{pages,phrases}.json`
  applied with `make seed [DRY=1]`.
- Seed reconciliation (earlier count): 60 frontend keys were missing from the
  backend seed. This session added 4 MORE frontend keys
  (`system.enroll_qr_label`, `system.enroll_qr_hint`, `errors.language_unsupported`,
  `settings.language_sync_failed`) that the user will add to
  `../backend/seed/phrases.json` manually — the reconcile count above predates them.

## Verified checks

- **This session the agent executed NO typecheck, lint, test, build or app run.**
- User-reported verification evidence during the session (pre-fix, for the
  language work): `vue-tsc` went 31 → 34 errors (3 × TS2322 `string` not
  assignable to the schema's language union, at `authRepository.ts:164/287` and
  `systemAuthRepository.ts:237`), and 2 test failures in
  `tests/auth/languageRepository.test.ts` (`repository` was `undefined` —
  destructuring bug in the test harness). Both were fixed in commit `efeaa16`.
- **Post-fix re-verification has NOT been reported yet**: `vue-tsc` must return
  to exactly 31 errors; the full Bun suite (17 files, incl. new
  `profileMappers`/`languageRepository`/`localeCodes` tests) must pass with
  0 skipped. Lint unverified for the new files.
- Earlier sessions (for the record): Bun suite 44/0 and lint exit 0 held before
  `81f7687`; browser/manual tests have never been executed for the migrated flows.

## Verified contract facts

- Saved-language fields (verified in the regenerated `schema.ts`):
  - `MeLanguageUpdateRequest { language_code: "uz"|"uz-Cyrl"|"ru"|"en" | null }`
    (required, nullable); `PATCH /api/v1/identity/me` → `MeResponse`.
  - `MeResponse.language_code?` and `TokenResponse.language_code?` optional
    nullable (login, register/complete, refresh, eimzo/login, switch-tenant).
    `TokenResponse.language_code` is deliberately unused — adoption always reads
    `/identity/me` via the guard's once-per-session block.
  - `SystemMeLanguageUpdateRequest { language_code: ... | null }`;
    `SystemMeResponse.language_code` required nullable;
    `GET`/`PATCH /api/v1/system/auth/me`; 422 code `system_language_unsupported`.
  - `RegisterStartRequest.language_code?` optional on
    `/api/v1/identity/register/start`.
  - `PreferencesUpdateRequest { document_events, locale? }` — full-replacement
    `PUT /api/v1/notifications/preferences` (unchanged behaviour, still reused).
- SYSTEM realm facts from the previous handoff still hold (two-step sign-in,
  pre-auth token handling, `aud: "system"`, `NO_RETRY_ENDPOINTS`, error-copy by
  machine code). One correction: **SYSTEM does have a saved-language endpoint now**
  (`PATCH /system/auth/me`) — the old "client-only SYSTEM language" decision is
  superseded (see `DECISIONS.md`).
- Public i18n contract facts (languages/translations, ETag, 20-page batching)
  unchanged; canonical `lang` mapping `uzc ↔ uz-Cyrl` in
  `features/i18n/domain/localeCodes.ts` still the only translation point, now
  alongside `toApiLanguageCode`.

## Open items

1. Re-run the authoritative checks after `efeaa16`: `vue-tsc` (expect exactly 31
   errors, all in system-admin/infrastructure), `bun run lint`, the full Bun suite
   (0 skipped). Report any new failure as a fix task — do not assume green.
2. User adds the 4 new keys to `../backend/seed/phrases.json` manually, then
   re-seeds; the older 60-key reconciliation is still open.
3. Migrate `features/system-admin` off `/api/v1/admin/*` (31-error baseline;
   includes the "administrator permissions" warning area 6d–6g the user flagged
   as out of scope twice).
4. Manual browser tests: TOTP enroll QR scan + text fallback (light/dark),
   language save flows (regular success, sync-failure warning, SYSTEM
   unsupported-language error), sign-in language adoption, register/start
   language_code on the wire.
5. Deferred by explicit user decision: the silent failed-content-load in the i18n
   loader (proposed fix + loader test recorded in
   `sessions/2026-11-11-system-auth-totp-and-i18n-diagnosis.md`).
6. Browser/manual regression for auth Phase 4, registration and SYSTEM flows.
7. UNKNOWN (carried over): whether `/identity/me.tenants[]` always contains the
   personal tenant; exact backend password policy beyond the 8-char minimum.
