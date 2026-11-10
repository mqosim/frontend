import createClient, { type Middleware } from 'openapi-fetch'

import type { AppError } from '@/shared/domain/errors'
import { err, ok } from '@/shared/domain/result'
import type { Result } from '@/shared/domain/result'
import { API_PREFIX } from '@/shared/infrastructure/config/env'
import { networkError, toAppError } from '@/shared/infrastructure/http/errors'
import type { paths } from './schema'

/**
 * Endpoints that SET, ROTATE or CLEAR the backend's httpOnly refresh cookie.
 * Only these send `credentials: 'include'`; everything else keeps the fetch
 * default (`same-origin`) so cookies are not attached where they are not
 * needed.
 *
 * Two contract generations live here while the feature slices migrate:
 * - the current FastAPI contract — the refresh cookie lives on
 *   `/api/v1/identity` (set by login / eimzo login / register completion,
 *   rotated by refresh and switch-tenant, cleared by logout; the SYSTEM realm
 *   keeps its own cookie on `/api/v1/system/auth`, set by login / TOTP);
 * - the previous contract — entries kept only for the not-yet-migrated slices
 *   and removed together with them.
 */
const COOKIE_ENDPOINTS = [
  // Current contract: the identity cookie lives on /api/v1/identity.
  '/identity/login',
  '/identity/eimzo/login',
  '/identity/register/complete',
  '/identity/refresh',
  '/identity/logout',
  '/identity/switch-tenant',
  // Current contract: the SYSTEM realm cookie lives on /api/v1/system/auth.
  '/system/auth/login',
  '/system/auth/totp',
  '/system/auth/totp/activate',
  '/system/auth/refresh',
  '/system/auth/logout',
  // Previous contract — removed together with its slices.
  '/auth/login',
  '/auth/login_with_signature',
  '/auth/login_with_usb',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/select_workspace',
  '/auth/switch_workspace',
]

/**
 * Endpoints the backend guards with its CSRF check: exactly the requests that
 * present the httpOnly refresh cookie (refresh, logout and switch-tenant, in
 * both realms). The check requires the `X-Requested-With: XMLHttpRequest`
 * header — a missing header is `csrf_header_required` (403) — and validates
 * `Origin` only when that header carries one. This is a header check, not a
 * double-submit token scheme: there is no CSRF cookie and no bootstrap
 * endpoint, so there is nothing to read or rotate client-side. The header is
 * attached ONLY to these requests, never to unrelated ones.
 */
const CSRF_ENDPOINTS = [
  '/identity/refresh',
  '/identity/logout',
  '/identity/switch-tenant',
  '/system/auth/refresh',
  '/system/auth/logout',
]

const CSRF_HEADER = 'X-Requested-With'
const CSRF_HEADER_VALUE = 'XMLHttpRequest'

/**
 * Endpoints whose 401 is a credential/session result the caller handles, never a
 * recoverable expiry. These must NOT trigger the shared refresh-and-retry: a bad
 * login must not rotate the session, and a failed refresh/logout must surface as
 * an error instead of recursing into itself. Same two-generation split as
 * `COOKIE_ENDPOINTS`: anonymous entry points and cookie-only operations of both
 * contracts; bearer-only endpoints (e.g. `/identity/me`) stay retryable.
 */
const NO_RETRY_ENDPOINTS = [
  // Current contract: anonymous entry points and cookie-only operations.
  '/identity/login',
  '/identity/eimzo/login',
  '/identity/eimzo/challenge',
  '/identity/register/start',
  '/identity/register/complete',
  '/identity/refresh',
  '/identity/logout',
  '/identity/logout-all',
  '/identity/switch-tenant',
  '/system/auth/login',
  '/system/auth/refresh',
  '/system/auth/logout',
  // Previous contract — removed together with its slices.
  '/auth/login',
  '/auth/login_with_signature',
  '/auth/login_with_usb',
  '/auth/register',
  '/auth/challenge',
  '/auth/refresh',
  '/auth/logout',
  '/auth/logout_all',
  '/auth/select_workspace',
  '/auth/switch_workspace',
]

export interface ApiClientOptions {
  readonly baseUrl: string
  /** Reads the in-memory access token, injected as `Authorization: Bearer`. */
  readonly getAccessToken: () => string | null
  /**
   * Called at most once when an authenticated request answers 401. Resolves `true`
   * when a fresh access token is in place, so the request is retried once; `false`
   * otherwise. Never called for the endpoints in `NO_RETRY_ENDPOINTS`.
   */
  readonly onUnauthorized?: () => Promise<boolean>
}

type RawApiClient = ReturnType<typeof createClient<paths>>

export type ApiClient = ReturnType<typeof createApiClient>

/** Reads the 401 status from an openapi-fetch result without assuming its shape. */
const isUnauthorized = (result: unknown): boolean => {
  if (typeof result !== 'object' || result === null) return false
  const response = (result as { response?: unknown }).response
  return response instanceof Response && response.status === 401
}

/** True when the request targets an endpoint that must never auto-refresh. */
const isNoRetryPath = (args: readonly unknown[]): boolean => {
  const path = args[0]
  return typeof path === 'string' && NO_RETRY_ENDPOINTS.some((suffix) => path.endsWith(suffix))
}

/**
 * `openapi-fetch` re-throws the underlying fetch error when it is not handled by
 * middleware. A refused connection (backend down, dev proxy unreachable) would
 * then escape as an exception instead of a `Result`. This proxy converts any
 * thrown error into the `response: undefined` shape that `toResult` maps to a
 * `Network` error, so callers only ever deal with `Result`.
 *
 * When `onUnauthorized` is provided it also gives every authenticated call one
 * silent recovery: a 401 renews the access token once and the request is retried
 * once. It never loops, and login/refresh/logout stay untouched. It is
 * type-transparent: the proxy keeps the client's exact method signatures.
 */
const guardNetworkErrors = (
  client: RawApiClient,
  onUnauthorized?: () => Promise<boolean>,
): RawApiClient =>
  new Proxy(client, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver)
      if (typeof value !== 'function') return value
      // `use` registers middleware and must stay bound to the real client.
      if (property === 'use') return value.bind(target)
      return async (...args: unknown[]) => {
        try {
          const result = await Reflect.apply(value, target, args)
          if (onUnauthorized !== undefined && isUnauthorized(result) && !isNoRetryPath(args)) {
            let recovered = false
            try {
              recovered = await onUnauthorized()
            } catch {
              recovered = false
            }
            if (recovered) return await Reflect.apply(value, target, args)
          }
          return result
        } catch {
          return { error: networkError(), response: undefined }
        }
      }
    },
  })

/**
 * Builds the one shared openapi-fetch client used by every feature repository.
 *
 * Request behaviour (all centralised here, never in feature code):
 * - JSON request/response handling and query-parameter serialization come from
 *   openapi-fetch; a call passes `query` (and any `RequestInit` field such as
 *   `signal` for cancellation or `AbortSignal.timeout(ms)` for timeouts)
 *   directly in its options.
 * - `Authorization: Bearer` is injected from the in-memory token store.
 * - `credentials: 'include'` is set only for the cookie-authenticated
 *   endpoints (see `COOKIE_ENDPOINTS`).
 * - The CSRF header is attached only to the cookie-presenting endpoints (see
 *   `CSRF_ENDPOINTS`).
 * - One silent recovery: an authenticated 401 renews the access token once and
 *   retries once (see `onUnauthorized`); it never loops.
 * - Any thrown transport error (backend down, proxy unreachable, abort) is
 *   normalised to a `Network` result instead of escaping as an exception.
 *
 * The client is independent of Vue and UI concerns: it never shows messages
 * and never redirects.
 */
export const createApiClient = ({ baseUrl, getAccessToken, onUnauthorized }: ApiClientOptions) => {
  const client = createClient<paths>({ baseUrl })

  const bearer: Middleware = {
    onRequest({ request }) {
      const token = getAccessToken()
      if (token !== null) request.headers.set('Authorization', `Bearer ${token}`)
      return request
    },
  }

  const cookies: Middleware = {
    onRequest({ request }) {
      if (COOKIE_ENDPOINTS.some((suffix) => new URL(request.url).pathname.endsWith(suffix))) {
        // `Request.credentials` is read-only; rebuild the request with the flag.
        return new Request(request, { credentials: 'include' })
      }
      return request
    },
  }

  /**
   * Attaches the CSRF header to the cookie-presenting endpoints only (see
   * `CSRF_ENDPOINTS`). Matched against the spec path (`schemaPath`), which is
   * the exact contract path and therefore independent of the base URL.
   */
  const csrf: Middleware = {
    onRequest({ request, schemaPath }) {
      if (CSRF_ENDPOINTS.some((suffix) => schemaPath.endsWith(suffix))) {
        request.headers.set(CSRF_HEADER, CSRF_HEADER_VALUE)
      }
      return request
    },
  }

  client.use(bearer, cookies, csrf)

  // Dev-only safety net. Spec paths already start with `/api/v1`, so a base URL
  // that also carries it yields `/api/v1/api/v1/…`. Report that once per client
  // (as a loud developer error) instead of letting it surface as a confusing
  // 404. `import.meta.env.DEV` is a literal `false` in production builds, so this
  // block is tree-shaken out of the bundle.
  if (import.meta.env.DEV) {
    let reported = false
    client.use({
      onRequest({ request }) {
        if (reported) return request
        const { pathname } = new URL(request.url)
        if (pathname.includes(`${API_PREFIX}${API_PREFIX}`)) {
          reported = true
          console.error(
            `[api] Doubled "${API_PREFIX}" in ${request.method} ${pathname}. ` +
              'VITE_API_BASE_URL must be an origin (e.g. https://api.example.com), not a path.',
          )
        }
        return request
      },
    })
  }

  return guardNetworkErrors(client, onUnauthorized)
}

/** The shape openapi-fetch resolves to, before normalisation. */
export interface ApiCall<T> {
  readonly data?: T
  readonly error?: unknown
  readonly response?: Response
}

/** Normalises an openapi-fetch result into a `Result`. */
export const toResult = <T>(call: ApiCall<T>): Result<T, AppError> => {
  if (call.response === undefined) return err(networkError())
  if (call.response.ok) return ok(call.data as T)
  return err(toAppError(call.response, call.error))
}
