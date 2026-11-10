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

## Process and environment (2026-11-10)

- Migration work stays on `main`. The AGENTS.md rule requiring an `api-migration` branch is obsolete for this work (explicit user decision).
- Always browse the dev app at `http://localhost:5173`. The backend's `CORS_ALLOW_ORIGINS` and `SYSTEM_CORS_ALLOW_ORIGINS` must include `http://localhost:5173`, because Origin is checked on refresh, logout and switch-tenant.
- Authoritative typecheck is the Node-based `vue-tsc` run by the user. `bun run typecheck` here is only a quick pre-check and does not cover `.vue` files; never claim `.vue` coverage from it. The 6 `.vue` errors from out-of-scope slices (E-IMZO panels, change email/password, language settings) are accepted; no Phase 3b fix is needed for the migrated auth/guard/runtime files.
