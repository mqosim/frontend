# Current state

## Repository facts (verified 2026-11-10)

- Branch: `main`. Work stays on `main`; the AGENTS.md `api-migration` branch rule is obsolete for this migration (explicit user decision). At handoff start the only working-tree changes were the tracked memory files `CURRENT_STATE.md` and `DECISIONS.md`; no source changes, nothing staged.
- Recent commits:
  - `4831756` — `refactor(i18n): migrate public content loader to FastAPI contract` (5 files)
  - `5956eb1` — `Update package.json` (`typecheck` now runs `vue-tsc` via Node)
  - `8400663` — `refactor(auth): migrate regular identity flow to FastAPI contract` (26 files)
- Tooling (`package.json`):
  - `typecheck`: `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.app.json`
  - `build`: typecheck + `vite build`
  - `lint`: `eslint .`
  - No test script and no test files in the repository.
- Dev environment: `vite.config.ts` proxies `/api` to `http://127.0.0.1:8000` (FastAPI). Always browse `http://localhost:5173`, not `127.0.0.1`: it keeps the `Secure; SameSite=None` refresh cookie and must be present in the backend's `CORS_ALLOW_ORIGINS` and `SYSTEM_CORS_ALLOW_ORIGINS` (Origin is checked on refresh/logout/switch-tenant).
- `.opencode/memory/*` is git-ignored (`.gitignore:29`). `CURRENT_STATE.md` and `DECISIONS.md` are tracked despite matching that pattern (they were added before the ignore); `TASK_LOG.md` and `sessions/*` are ignored.

## API migration status

- Phase 0 (dev proxy target) — done.
- Auth Phase 2 (auth infrastructure + domain rebuild) — done, committed in `8400663`.
- Auth Phase 3 (session runtime, guard bootstrap, pending-workspace removal) — done, committed in `8400663`.
- Auth Phase 4 (manual browser test plan) — plan delivered; **browser tests not executed**.
- i18n public content loader — done, committed in `4831756`: active languages + translations repositories, repeatable `page`, internal `uzc` ↔ API `uz-Cyrl` mapping, 20-page chunking, actual-served-language adoption, 304 branch retained.
- Still on the old contract: SYSTEM/admin, E-IMZO, registration, password/email change, language saving (settings/system-auth).

## Verified checks

- Authoritative Node-based `vue-tsc` (run by the user **before** the i18n migration) — exit 2, **48 errors**:
  - 42 source errors (all out of scope at that time);
  - 6 `.vue` call sites: `EimzoLoginPanel.vue`, `EimzoRegisterPanel.vue`,
    `ChangeEmailCard.vue` (×2), `ChangePasswordCard.vue`,
    `LanguageSettingsSection.vue`.
  - No errors in `WorkspaceSwitchDialog.vue`, `UserMenu.vue`,
    `ProfileSettingsSection.vue`, `PasswordLoginPanel.vue`, `App.vue`.
  - **Post-i18n Node run was not executed.** The user runs the authoritative
    Node-based check; `.vue` coverage must not be claimed from Bun runs.
- Bun `bun run typecheck` (quick pre-check only; **does not cover `.vue`**) after
  `4831756` — exit 2, **39 errors**, no `features/i18n` errors:
  - `system-admin/infrastructure/adminRepository.ts` — 21
  - `system-admin/infrastructure/mappers.ts` — 6
  - `system-auth/infrastructure/mappers.ts` — 5
  - `system-admin/infrastructure/auditLogRepository.ts` — 4
  - `system-auth/infrastructure/systemAuthRepository.ts` — 2
  - `auth/presentation/composables/useEimzoKeys.ts` — 1
- `bun run lint` after `4831756` — exit 0 (only the pre-existing `boundaries`
  descriptor warning).
- i18n throwaway runtime experiment (`bun --tsconfig-override`, real repository +
  loader + plugin, mocked fetch) — **11/11 checks passed**; directory deleted.
  Covered: language mapping, translations mapping + ETag, request encoding,
  304, 404 per-batch retry, unknown-language adoption, malformed JSON fallback,
  empty 200 body, 422 fallback, 20/20/5 chunking, cache hits, locale aliases.
- Auth throwaway runtime experiment (earlier) — 26/26 checks passed.
- Grep proof for `workspace_required`, `requiresPendingWorkspace`,
  `setWorkspaceRequired`, `needsWorkspace`, `WorkspaceSelectionPage`,
  `/workspaces` — no matches.
- `bun run build` was not run (it runs `vue-tsc` first and would stop on the
  out-of-scope errors).

## Verified contract facts

- Login identifier: the backend's `normalize_phone` accepts `+998…`,
  `998XXXXXXXXX` and 9-digit forms; the client normalizes phones to digits only.
  Email is lowercased server-side.
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

- Run the authoritative Node-based `bun run typecheck` after `4831756`; the Bun
  pre-check cannot see `.vue` errors.
- Execute the Auth Phase 4 manual browser plan and record results.
- UNKNOWN: whether `/identity/me.tenants[]` always contains the personal tenant
  (list is rendered as returned).
- Out of scope and still red: the 39 Bun pre-check errors listed above, plus the
  6 known `.vue` call sites that only the Node-based run can see.
- i18n ETag revalidation is intentionally **not** wired (the 304 branch exists
  but `If-None-Match` is never sent); no negative caching for omitted pages.
