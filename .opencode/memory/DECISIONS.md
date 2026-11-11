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

## Process and environment (2026-11-10)

- Migration work stays on `main`. The AGENTS.md rule requiring an `api-migration` branch is obsolete for this work (explicit user decision).
- Always browse the dev app at `http://localhost:5173`. The backend's `CORS_ALLOW_ORIGINS` and `SYSTEM_CORS_ALLOW_ORIGINS` must include `http://localhost:5173`, because Origin is checked on refresh, logout and switch-tenant.
- Authoritative typecheck is the Node-based `vue-tsc` run by the user. `bun run typecheck` here is only a quick pre-check and does not cover `.vue` files; never claim `.vue` coverage from it. The 6 `.vue` errors from out-of-scope slices (E-IMZO panels, change email/password, language settings) are accepted; no Phase 3b fix is needed for the migrated auth/guard/runtime files.
