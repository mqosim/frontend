# Decisions

## Auth migration (2026-11-10)

- Session expiry is scheduled from the contract's `expires_in`, not from a decoded JWT. The regular context never calls `decodeAccessToken`; SYSTEM keeps a clearly marked transitional JWT fallback (`toOutcome` + `readExpiryFromToken`) to remove when `/system/auth` exposes tenant/expiry data.
- Cross-tab renewal: after acquiring the refresh lock, adopt a sibling's broadcast token (`token` + `expiresAt`) by calling `GET /identity/me`; refresh only when nothing fresh was adopted. Adoption is skipped when the broadcast predates the renewal request, because the cookie read at request time is then already post-rotation.
- The new contract has no pending-workspace step: login, refresh and tenant switch always produce a complete session. `/workspaces` and `WorkspaceSelectionPage` are removed; `/workspace` redirects to `app-home`.
- Tenant identity is `tenant_id` from `/identity/me`; `WorkspaceChoice` is `{ tenantId }`. The personal tenant is a normal tenant row labelled via `workspace.personal`.
- `userId` is null in the token response and filled from `/identity/me` at guard bootstrap. No authorization depends on it.
- Concurrent `/identity/me` calls are deduped inside the repository (in-flight only, no time-based cache).
- Login uses one `identifier` field (email or phone). Verified against the backend's `normalize_phone`: `+998…`, `998XXXXXXXXX` and 9-digit forms are all accepted; the client normalizes phones to digits only. Email is lowercased server-side.
- The tenant list is loaded for any authenticated regular session (not only PERSON), so a PERSON switched into an organization can switch back.

## i18n public content (2026-11-10)

- Internal locale codes stay `uz`, `uzc`, `ru`, `en`; API codes are translated only in `features/i18n/domain/localeCodes.ts`. `uzc` maps to `uz-Cyrl`; aliases `uzc`, `uz-Cyrl`, `uz-Cyrl-UZ` normalize to `uzc`; unknown codes pass through unchanged.
- `TranslationOutcome.ok` carries the internal `lang` actually served. The loader returns it and the plugin adopts it for the vue-i18n locale, `<html lang>` and the locale store (store write only when it differs). The served language need not be present in the active-language list.
- Translations use the canonical repeatable `page` parameter, not the legacy `pages` alias. Missing pages are fetched in batches of 20; a 404 batch retries only its own slugs one by one.
- ETag is captured and the 304 branch is kept, but `If-None-Match` is deliberately not sent yet: cache-first loading stays as-is and no revalidation behaviour was introduced.
- Pages with no phrases are not negative-cached; they are retried on later navigations.
- An empty 200 translations body is treated as success with empty bundles and the requested language.

## Password+OTP registration (2026-11-10)

- The `/register` route now hosts the password+OTP flow (`PasswordRegisterPanel.vue`); the previous E-IMZO register panel is left untouched but is unreachable.
- `Accept-Language` is sent on **both** `register/start` and `register/complete` via `toApiLang(getCurrentLocale())` through openapi-fetch's `headers` option, even though OpenAPI does not declare the header on those paths.
- Client password validation is non-empty only; `weak_password` is authoritative and the backend policy beyond the 8-char minimum is UNKNOWN. Login password behavior is unchanged.
- OTP code is trimmed and validated as non-empty only. `full_name` is normalized client-side (collapse whitespace, trim, 2..200, reject control characters) to match the backend rule.
- Resend is a second `register/start` with the same identifier after `resend_after`; success replaces `pending_id` and resets both timers. On 429 the cooldown uses `retryAfterMs` when present. All registration errors are mapped through `registerErrorMessageKey`.
- Registration reuses login identifier normalization (`toLoginIdentifier`) and the login session-adoption/redirect path.

## SYSTEM realm auth (2026-11-11)

- SYSTEM sign-in is two steps: `POST /system/auth/login` only verifies the password and arms the second factor; the session is opened by `POST /system/auth/totp`. `beginLogin` returns just `{totpEnrolled}`, never a session or token.
- The pre-authentication token lives entirely inside `systemAuthRepository`: kept in memory, sent only as `X-System-Pre-Auth`, never exposed to application/presentation code and never logged. It survives a wrong code (retry in place), and is dropped on a new login, on logout, on `system_pre_auth_invalid`, and once its `expires_in` elapses. A repository-only expiry timer is authoritative for "spent"; no extra request is sent to find out.
- A session is accepted only when the token's `aud` is `system` (string or list). The pre-auth token's `aud: "system-preauth"` and regular PERSON/ORG tokens are rejected. Signature is never verified client-side; the server remains the authority.
- `/system/auth/totp`, `/totp/enroll`, `/totp/activate`, `/login`, `/refresh`, `/logout` are in `NO_RETRY_ENDPOINTS`: the client's silent 401 refresh-and-retry never applies to them.
- First login order is enforced in the UI: credentials → enroll → activate → recovery codes → totp → dashboard. A `totp_not_enrolled`/`totp_already_enrolled` code re-routes to the matching step instead of surfacing an error.
- ~~SYSTEM has no saved-language endpoint: the SYSTEM settings language section switches this browser only, and the guard no longer adopts a SYSTEM account language.~~ **Superseded 2026-11-11**: the contract now has `PATCH /system/auth/me`; see "Saved-language fields (2026-11-11)" below.
- SYSTEM error copy is chosen by backend machine code first (`system_invalid_credentials`, `system_account_locked`, `totp_invalid`, `recovery_code_invalid`, …) and falls back to the shared credential/kind mapping; backend `message` is never surfaced.

## TOTP-enroll QR code (2026-11-11)

- The enroll step renders the one-time `otpauth_uri` as a scannable QR built 100% client-side with `uqr ^0.1.3` (MIT, zero deps, ESM): ECC `M`, 4-module quiet zone, ~220 px black-on-white in both themes, one inline SVG `<path>` — no `v-html`, no canvas, no `data:` URL, no `<img>`; nothing about the URI/secret is logged or stored.
- `uqr` is loaded only through a dynamic `import()` inside the enroll step (`features/system-auth/presentation/enrollmentQr.ts`), so it never enters the main/sign-in chunk; generation is guarded so a late async result cannot write state after leaving the step, and QR state is cleared in restart/continue/unmount alongside the enrollment payload.
- Any failure degrades to the existing secret/URI text fallback; the DEV console warning is generic by design.

## Saved-language fields (2026-11-11)

- Product decision: UI language and notification language are the SAME; saving a language writes both.
- Regular save order is fixed: `PATCH /identity/me` first (failure → error by machine code, no switch, no notification call), then `i18n.switchTo`, then the notification sync (GET current preferences, full-replacement PUT — reused `notifications.saveLocale`). A failed sync leaves the language switched and shows the soft warning `settings.language_sync_failed` (AppAlert `variant="warning"`); no revert.
- SYSTEM save is `PATCH /system/auth/me` only (no notifications). `SystemSettingsPage.applyLanguage` throws the repository's `AppError`; the shared `LanguageSettingsSection` maps it by machine code (`errorMessageKey` now resolves `system_language_unsupported` → `errors.language_unsupported`).
- Sign-in adoption rides the existing once-per-session guard `/me` adoption in BOTH contexts (`regularLanguageApplied` / `systemLanguageApplied` flags); `TokenResponse.language_code` is deliberately unused, so refresh/switch-tenant returning `null` can never reset the current language, and a stored code from a later-deactivated language is tolerated (loader falls back to what the backend serves / embedded English).
- The settings section's displayed "saved" language comes from `/identity/me.language_code` (fallback to the locale store on failure/null) — the notification-preferences read on mount was removed.
- Language codes are typed end to end: `ApiLanguageCode` (`'uz' | 'uz-Cyrl' | 'ru' | 'en'`) lives in `features/i18n/domain/localeCodes.ts` with `toApiLanguageCode()` (null for unsupported, canonical spelling, `uzc → uz-Cyrl`); `auth/infrastructure/mappers.ts` derives `ApiLanguageCodeDto` from the generated schema and asserts equality at compile time (`API_LANGUAGE_CODE_MATCHES_SCHEMA`) — drift breaks the build, no casts. Repositories/ports/use cases take `ApiLanguageCode`; unsupported values are omitted from the request body or fail the save locally, never sent as `null`.

## SYSTEM admin control plane (2026-11-12)

- The control plane is FastAPI-only: `/api/v1/system/{tenants,users,permissions,audit}`;
  the retired `/api/v1/admin/*` surface has no references left in the frontend.
- **D1 (organization members):** the global Users directory, its detail page and
  member block/unblock/session-revoke actions were removed (no such backend
  capability). Members are listed read-only on the tenant detail page via
  `GET /system/tenants/{id}/users` (offset + body `total`). Route params renamed to
  `:tenantId`/`:userId`; the `users` menu entry was removed.
- **D2 (audit detail):** rows expand from the list item — `SystemAuditEntryResponse`
  carries every displayable field and no detail endpoint exists. Audit listing is
  cursor-paginated (`next_cursor` → Load-more) with `occurred_from`/`occurred_to`
  window presets.
- **D3 (search):** the backend supports no text search on these lists; filtering is
  client-side over the loaded page with an explicit scope notice
  (`system.admin_filter_scope`).
- Tenant suspend/reactivate require a **reason** (1..200 chars, stored in the audit
  record): the shared `ConfirmDialog` gained an optional reason input and disables
  Confirm until it is non-blank; `useAdminAction` passes the reason to `run`.
- Lists are offset-paged with `total` in the body (`toBodyPage`); the
  `X-Total-Count` header is no longer read. Only the audit endpoint is cursor-based.
- The permission catalogue is the backend's fixed 9-code set (see
  `domain/permissions.ts`); staff PATCH values are validated client-side against
  derived guards (`isSystemUserRole`/`isSystemUserStatus` in `mappers.ts`) and an
  out-of-contract value becomes a local validation error, never a request.
- Staff role editing is single-choice (`SystemUserUpdateRequest.role` is singular);
  staff disable/enable is `PATCH {status}`; there are no staff block/unblock or
  session-revoke endpoints.

## Language selector display (2026-11-12)

- Language names are always shown in their own language. The source of truth is the
  active-languages API's `native_name` (mapped to `Language.nativeName`), with a
  built-in native fallback table (`NATIVE_NAMES` in `languageLabels.ts`) holding the
  same exact labels; neither is translated into the active UI language.
- Flag resolution normalizes any code form through `fromApiLang` (explicit
  `uz_Cyrl → uzc` underscore alias added to `localeCodes.ts`), so `uz`, `uzc`,
  `uz-Cyrl` and `uz_Cyrl` all resolve to the Uzbekistan flag artwork.
- The compact header selector keeps its short native abbreviations (`O'z`, `Ўз`,
  `Ру`, `En`); full native names appear in the Settings selector, as before.

## Per-realm logout composables (2026-11-12)

- Architecture-audit verdict kept as a convention: each realm's post-auth feature
  hosts its logout UI orchestrator — `useOrgLogout` in org-dashboard,
  `useSystemLogout` in system-admin — while the logout *mechanism* (use case,
  session store, token clearing) stays in the auth feature and shared
  infrastructure. Do not "centralize" these into system-auth or app.

## Process and environment (2026-11-10)

- Migration work stays on `main`. The AGENTS.md rule requiring an `api-migration` branch is obsolete for this work (explicit user decision).
- Always browse the dev app at `http://localhost:5173`. The backend's `CORS_ALLOW_ORIGINS` and `SYSTEM_CORS_ALLOW_ORIGINS` must include `http://localhost:5173`, because Origin is checked on refresh, logout and switch-tenant.
- Authoritative typecheck is the Node-based `vue-tsc`: `bun run typecheck` (and `build`) already execute `node node_modules/vue-tsc/bin/vue-tsc.js …`, so they **do** cover `.vue` files. Node IS installed on this machine (`v26.13.0`); only a Bun-invoked `vue-tsc` (e.g. `bun node_modules/vue-tsc/bin/vue-tsc.js`) silently skips SFCs and must never be used as evidence. The historical out-of-scope `.vue` errors are gone — the tree is at 0 errors.

## SYSTEM i18n Manager and permission gating (2026-11-12)

- The permission set is the only UI gate; a page's own grant is never inferred from a broader one (`tenants.read` must never stand in for `system.users.read`). Routes declare `systemPermission`, the guard resolves `/system/auth/me` before deciding, and an unauthorized direct visit renders the in-shell `/system/access-denied` view instead of redirecting.
- `AdminIdentity` carries the backend's single `role` (`string | null`, mirroring `SystemMeResponse.role`); authorization still reads the returned `permissions[]` array, never the role name, and an unknown role grants nothing.
- The catalog is `i18n.read` to open and `i18n.manage` to mutate; the Import tab is manage-only. Languages are the four fixed backend codes (activate / make default only) because there is no create/delete; pages are deletable only when empty (409 `page_not_empty` mapped to copy).
- The dashboard is navigation only. `domain/systemSampleData.ts` was deleted rather than adapted: fake statistics cannot be served by the new contract, and no aggregate endpoints are consumed yet.
- Phrase keys must exist in BOTH `fallbackMessages.ts` and `docs/phrases-to-seed.json` with identical English values (`tests/i18n/phrasesSeed.test.ts`), and every message must compile under vue-i18n (`tests/i18n/messageCompilation.test.ts`). Seed values containing literal JSON braces are written with vue-i18n escapes (`{'{'}`) — raw braces throw at `t()` time.
- Admin table controls that belong together ("Edit"/"Delete") use the additive `.admin-table__actions--nowrap` modifier rather than changing the shared base class, so other admin tables keep their existing wrapping behaviour.
- `admin-toolbar__input` carries `flex: 1 1 14rem` for horizontal toolbars; reusing it inside a column-flow field resolves to a 14 rem **height**. i18n fields therefore reset it locally (`.i18n-field .admin-toolbar__input { flex: none }`); do not reuse the row-toolbar class inside a column field.
- Wide pages opt in: `AdminPage` gained a `wide` prop using the existing 60 rem `--content-max-width-settings`, instead of widening the shared page frame globally.
